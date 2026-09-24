// The editor's part of a custom exercise's photo, GIF or video, and its link (CustomExForm in
// sheets.jsx). The row follows #295's picture field (horusglez) — the thumb of the draft, a
// tinted Add/Change and a ghost Remove — and the link field is #246's (Vaibhav159).
//
// A picked file is turned into what the state keeps right here (lib/media-ingest.js: re-encoded
// or scrubbed, hashed, with a poster) and put into the local store as pending before the form is
// saved. That order is safe: an abandoned draft's files are unreferenced and the local clean-up
// takes them after an hour; the server marks an upload that nothing references yet and keeps it
// for its grace period, so the state push landing after the upload changes nothing.
//
// The file input accepts image/* and video/* and nothing more specific: iOS converts a HEIC
// photo to JPEG only when the page does not explicitly ask for HEIC, and every format is checked
// on its bytes anyway.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { mediaOf, fmtClip } from '../lib/media-refs.js'
import { mediaStore } from '../lib/media-store.js'
import { MOBILE } from '../lib/mobile.js'
import { limitsFrom, fmtMB, MB } from '../lib/media-limits.js'
import { CustomThumb } from './CustomMedia.jsx'
import { Row, Button } from './ui.jsx'
import Icon from './Icon.jsx'

const toast = m => useUI.getState().toast(m)

/** The sentence for a refused file (MediaError codes from lib/media-ingest.js). */
export function mediaErrorText(e) {
  switch (e?.code) {
    case 'type': return t('That file type is not supported — use a photo, a GIF, or an MP4, MOV or WebM video.')
    case 'too-large': return t('That file is too large — up to {0} MB.', fmtMB(e.mb))
    case 'too-long': return t('That video is too long — up to {0} seconds.', e.sec)
    case 'photo-too-big': return t('That photo is too large to process on this device.')
    default: return t('This browser cannot read that file.')
  }
}

const KIND_ICON = { image: 'image', gif: 'play', video: 'play' }

export default function CustomMediaField({ media, url, onChange }) {
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState(null)
  // Whether files picked here outlive the tab: false when IndexedDB is blocked and the store runs
  // in memory — then nothing is offered, since a saved exercise would point at nothing tomorrow.
  const [storable, setStorable] = useState(true)
  const fileRef = useRef(null)
  useEffect(() => {
    let alive = true
    mediaStore.ready().then(() => { if (alive) setStorable(mediaStore.persistent) }).catch(() => { if (alive) setStorable(false) })
    return () => { alive = false }
  }, [])
  const m = mediaOf({ media })
  // Signed in to a server that answered without a `media` block: it predates the feature or has
  // MEDIA_UPLOADS=0. Nothing would ever reach it. A config not known yet (an offline start) is
  // not that answer — a file picked then waits here and goes up once the server is reached. A
  // guest in the browser is on that same server, and what it picks would be owed and never sent
  // once it signs up; a phone in local mode has no server (a config left from an earlier pairing
  // says nothing about it).
  const serverLacks = (!!user || !MOBILE) && !!config && !config.media

  const onFile = async ev => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''   // picking the same file again still fires onChange
    if (!file) return
    setBusy(true)
    setWarning(null)
    try {
      // The ingest (decoders, canvas, the MP4 walk) only loads when someone picks a file.
      const { ingestMediaFile } = await import('../lib/media-ingest.js')
      const out = await ingestMediaFile(file, limitsFrom(config))
      for (const b of out.blobs) await mediaStore.put(b.hash, b.blob, { mime: b.mime, pending: true })
      // A guest's or a local phone's copy is the only one: ask the browser not to evict it under
      // storage pressure. Best effort, and absent on plain http.
      if (!user) { try { globalThis.navigator?.storage?.persist?.()?.catch?.(() => {}) } catch { /* not offered */ } }
      onChange({ media: out.media })
      if (out.warnings.includes('codec')) setWarning(t('This video may not play on every device — MP4 (H.264) plays everywhere.'))
    } catch (e) {
      toast(mediaErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  // "0:07 · 2.4 MB": the length of a clip or an animation, and the size of the file itself (the
  // unit through the packs' own "{0} MB", so it reads Mo, МБ, م.ب where it should).
  const sizeLine = m ? [m.dur != null && m.kind !== 'image' ? fmtClip(m.dur) : null, t('{0} MB', Math.max(0.1, Math.round((m.size / MB) * 10) / 10).toFixed(1))].filter(Boolean).join(' · ') : null
  const subtitle = m
    ? <span className="cmf-sub"><Icon name={KIND_ICON[m.kind]} />{sizeLine}</span>
    : t('Optional — a picture makes it easier to spot in a list.')
  const note = !storable ? t('This browser cannot store photos or videos here.')
    : serverLacks ? t('Your server does not store photos and videos yet.')
      : !user ? t('Kept on this device only — Export with photos & videos keeps a copy.')
        : null

  return <div className="cmf">
    <Row icon="image" iconTint="var(--blue)" title={t('Photo, GIF or video')} subtitle={subtitle}>
      <div className="cmf-act">
        {m && <span className="cmf-thumb"><CustomThumb ex={{ custom: true, media: m }} /></span>}
        {/* Hidden on a server that will never take a file; shown but off where this browser
            cannot keep one, with the note below saying why. */}
        {!serverLacks && <Button variant="tinted" size="sm" icon={busy ? undefined : 'image'} disabled={busy || !storable} onClick={() => fileRef.current?.click()}>
          {busy ? t('Loading…') : m ? t('Change') : t('Add')}
        </Button>}
        {m && <Button variant="ghost" size="sm" icon="xmark" aria-label={t('Remove')} title={t('Remove')} disabled={busy} onClick={() => { setWarning(null); onChange({ media: null }) }} />}
      </div>
    </Row>
    <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={onFile} />
    {warning && <div className="small dim cmf-note">{warning}</div>}
    {note && <div className="small dim cmf-note">{note}</div>}
    <input className="input cmf-link" type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
      dir={url ? 'ltr' : undefined} placeholder={t('Video or guide link (optional)')}
      value={url || ''} onChange={e => onChange({ url: e.target.value })} />
  </div>
}
