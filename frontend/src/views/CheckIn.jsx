import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { canRenderFmt } from '../lib/qr.js'
import { scanCode, importCodeFromImage } from '../lib/scan.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from '../components/Icon.jsx'
import QrCanvas from '../components/QrCanvas.jsx'
import CameraScan from '../components/CameraScan.jsx'
import { Button, TextField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'

// Gym check-in (reached from the Home "Check in" card; app and PWA alike). Shows each saved membership
// code as a QR the turnstile can read, swiped through horizontally, with a trailing "+" to add
// another. We only ever store the code's value + symbology; the QR is regenerated from it here
// every time (see lib/qr.js), so nothing sensitive is kept as an image.
export default function CheckIn() {
  const nav = useNavigate()
  const cards = useStore(s => s.S.gymCards) || []
  const railRef = useRef(null)
  const [active, setActive] = useState(0)

  // Which card the horizontal scroll has settled on — drives the little dots. Reading it off the
  // scroll position keeps the rail itself the single control; no separate paging state to sync.
  const onScroll = () => {
    const rail = railRef.current
    if (!rail) return
    const i = Math.round(rail.scrollLeft / rail.clientWidth)
    setActive(i)
  }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 28 }}>{t('Check in')}</h1>
        <div className="sub">{cards.length ? t('Show this at the gym') : t('Add your gym card')}</div>
      </div>
    </div>

    <div className="ci-rail" ref={railRef} onScroll={onScroll}>
      {cards.map(card => <CardFace key={card.id} card={card} />)}
      <button className="ci-add" onClick={openAddCard}>
        <Icon name="plus" />
        <span className="ci-add-t">{t('Add a card')}</span>
      </button>
    </div>

    {(cards.length > 0) && <div className="ci-dots">
      {cards.map((c, i) => <span key={c.id} className={'ci-dot' + (i === active ? ' on' : '')} />)}
      {/* the add card is a slide too, so it gets a dot */}
      <span className={'ci-dot' + (active >= cards.length ? ' on' : '')} />
    </div>}

    {!cards.length && <div className="muted small" style={{ textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
      {t('Type the number on your membership card, import a photo of it, or scan it with the camera. No extra app needed at the gym — just open this screen.')}
    </div>}
  </div>
}

// One saved card: its label, the QR, and the raw value underneath (handy when a reader is fussy
// and a staff member types it in). Long-press / the trash button removes it.
function CardFace({ card }) {
  const update = useStore(s => s.update)
  const remove = () => confirmSheet({
    title: t('Remove this card?'),
    message: card.label,
    confirmText: t('Remove'),
    danger: true,
    onConfirm: () => update(s => { s.gymCards = (s.gymCards || []).filter(c => c.id !== card.id) }),
  })
  return <div className="ci-card">
    <div className="row between" style={{ width: '100%', alignItems: 'flex-start' }}>
      <div className="ci-label" style={{ flex: 1 }}>{card.label}</div>
      <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 14, color: 'var(--red)' }} onClick={remove} aria-label={t('Remove')}><Icon name="trash" /></button>
    </div>
    <div className="ci-qr-plate"><QrCanvas value={card.value} size={230} /></div>
    <div className="ci-value">{card.value}</div>
  </div>
}

/* ------------------------------------------------------------- add-card sheet -- */

// Opens the add-card sheet. Co-located with the view (not sheets.jsx) because it pulls in the
// scanner paths — keeping it here keeps them out of the shared sheets module.
export function openAddCard() {
  useUI.getState().openSheet(close => <AddCard close={close} />)
}

function saveCard({ label, value, fmt }) {
  const update = useStore.getState().update
  const toast = useUI.getState().toast
  const trimmed = (value || '').trim()
  if (!trimmed) { toast(t('Nothing to save yet')); return false }
  // We can read many barcode kinds but only redraw QR faithfully — refuse anything else rather
  // than store a code that would display as the wrong bars at the turnstile.
  if (fmt && !canRenderFmt(fmt)) { toast(t("That's not a QR code — only QR cards can be shown here")); return false }
  update(s => {
    if (!Array.isArray(s.gymCards)) s.gymCards = []
    s.gymCards.push({ id: uid(), label: (label || '').trim() || t('Gym card'), value: trimmed, fmt: 'qrcode' })
  })
  toast(t('Card added'))
  return true
}

function AddCard({ close }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const toast = useUI(s => s.toast)

  const commitTyped = () => { if (saveCard({ label, value, fmt: 'qrcode' })) close() }

  // Camera scan: in the app, hands off to the native scanner; in a browser, opens our own camera
  // sheet on top of this one. Either way the value drops straight into the form so the user can
  // still name it before saving.
  const doScan = async () => {
    if (!MOBILE) {
      useUI.getState().openSheet(close => <CameraScan
        onCancel={close}
        onFound={code => {
          close()
          if (!canRenderFmt(code.fmt)) { toast(t("That's not a QR code — only QR cards can be shown here")); return }
          setValue(code.value)
        }} />)
      return
    }
    setBusy(true)
    try {
      const code = await scanCode()
      if (!code) return                       // user backed out
      if (!canRenderFmt(code.fmt)) { toast(t("That's not a QR code — only QR cards can be shown here")); return }
      setValue(code.value)
    } catch (e) {
      toast(scanErrorMessage(e))
    } finally { setBusy(false) }
  }

  const onFile = async ev => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''                       // let the same file be picked again later
    if (!file) return
    setBusy(true)
    try {
      const code = await importCodeFromImage(file)
      if (!code) { toast(t('No QR code found in that image')); return }
      if (!canRenderFmt(code.fmt)) { toast(t("That's not a QR code — only QR cards can be shown here")); return }
      setValue(code.value)
    } catch (e) {
      toast(t('Could not read that image'))
    } finally { setBusy(false) }
  }

  return <>
    <h3>{t('Add a card')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Scan it, import a photo, or type the code by hand.')}</div>

    <div className="row" style={{ gap: 8, marginBottom: 16 }}>
      <Button variant="tinted" icon="camera" onClick={doScan} disabled={busy}>{t('Scan')}</Button>
      <Button variant="tinted" icon="image" onClick={() => fileRef.current?.click()} disabled={busy}>{t('Import photo')}</Button>
    </div>

    <label className="sect-t">{t('Label')}</label>
    <TextField value={label} onChange={e => setLabel(e.target.value)} placeholder={t('e.g. FitZone downtown')} style={{ marginBottom: 12 }} />

    <label className="sect-t">{t('Code')}</label>
    <TextField value={value} onChange={e => setValue(e.target.value)} placeholder={t('Membership number or code')} inputMode="text" style={{ marginBottom: 16 }} />

    {value.trim() && <div className="ci-qr-plate" style={{ alignSelf: 'center', marginBottom: 16 }}><QrCanvas value={value.trim()} size={150} /></div>}

    <Button variant="primary" onClick={commitTyped} disabled={busy || !value.trim()}>{t('Save card')}</Button>

    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
  </>
}

// Map the thrown reasons from lib/scan.js to something a person can act on.
function scanErrorMessage(e) {
  const m = String(e && e.message)
  if (m === 'permission-denied') return t('Camera permission is needed to scan. Enable it in Settings.')
  if (m === 'unsupported') return t('Scanning is not available on this device.')
  return t('Could not start the scanner')
}
