import { describe, it, expect } from 'vitest'
import { exportBackupZip, readBackupFile, storeBackupMedia, sanitizeCustomMedia, BACKUP_JSON } from './backup-media.js'
import { createMediaStore, memoryBackend } from './media-store.js'
import { zipStore, readZip } from './zip.js'
import { sha256Hex } from './sha256.js'
import { jpeg, png, mp4 } from './media-samples.test-util.js'

const refFor = async (bytes, mime, kind = 'image') => ({ kind, hash: await sha256Hex(bytes), mime, size: bytes.length, width: 4, height: 3, at: 1 })
const stateWith = customEx => ({ unit: 'kg', workouts: [], routines: [], bodyweight: [], customEx })

describe('export with photos & videos', () => {
  it('writes the same JSON, every file the state refers to under its hash, and a README; counts what it could not get', async () => {
    const media = createMediaStore(memoryBackend())
    const photo = jpeg(), poster = png(), clip = mp4().file
    const main = await refFor(photo, 'image/jpeg')
    const vid = await refFor(clip, 'video/quicktime', 'video')
    main.poster = { hash: await sha256Hex(poster), mime: 'image/webp', size: poster.length, width: 2, height: 2 }
    await media.put(main.hash, new Blob([photo]), { mime: 'image/jpeg' })
    await media.put(main.poster.hash, new Blob([poster]), { mime: 'image/png' })
    await media.put(vid.hash, new Blob([clip]), { mime: 'video/quicktime' })
    const gone = { ...main, hash: 'f'.repeat(64), poster: undefined }
    const S = stateWith([{ id: 'a', n: 'a', media: main }, { id: 'b', n: 'b', media: vid }, { id: 'c', n: 'c', media: gone }])
    const fetched = []
    const out = await exportBackupZip(S, { media, fetchOne: async h => { fetched.push(h); throw new Error('404') } })
    expect(out.missing).toBe(1)
    expect(out.included).toBe(3)
    expect(fetched).toEqual(['f'.repeat(64)])
    const entries = await readZip(out.blob)
    expect(entries.map(e => e.name)).toEqual([BACKUP_JSON, `media/${main.poster.hash}.png`, `media/${main.hash}.jpg`, `media/${vid.hash}.mov`, 'README.txt'])
    expect(JSON.parse(await entries[0].blob.text())).toEqual(JSON.parse(JSON.stringify(S, null, 2)))
  })
})

describe('import', () => {
  it('a zip brings its state and, once stored, its files as pending', async () => {
    const photo = jpeg()
    const main = await refFor(photo, 'image/jpeg')
    const S = stateWith([{ id: 'a', n: 'a', media: main, url: 'youtu.be/x' }])
    const zip = await zipStore([{ name: BACKUP_JSON, blob: new Blob([JSON.stringify(S)]) }, { name: `media/${main.hash}.jpg`, blob: new Blob([photo]) }, { name: 'media/' + 'e'.repeat(64) + '.jpg', blob: new Blob([photo]) }])
    const read = await readBackupFile(new File([zip], 'backup.zip'))
    expect(read.zip).toBe(true)
    expect(read.state.customEx[0].url).toBe('https://youtu.be/x')
    expect(read.files.map(f => f.hash)).toEqual([main.hash])   // only what the state refers to
    const media = createMediaStore(memoryBackend())
    expect(await storeBackupMedia(read.files, { media })).toEqual({ stored: 1, skipped: 0 })
    expect(await media.get(main.hash)).toMatchObject({ mime: 'image/jpeg', pending: true })
  })

  it('a tampered file is skipped, and so is one over its cap or of a type that is not stored', async () => {
    const photo = jpeg()
    const main = await refFor(photo, 'image/jpeg')
    const tampered = photo.slice(); tampered[tampered.length - 1] ^= 1
    const html = new TextEncoder().encode('<!doctype html><script>alert(1)</script>')
    const htmlRef = { ...main, hash: await sha256Hex(html) }
    const big = new Uint8Array(3 * 1024 * 1024); big.set(photo)
    const bigRef = { ...main, hash: await sha256Hex(big), size: big.length }
    const S = stateWith([{ id: 'a', media: main }, { id: 'b', media: htmlRef }, { id: 'c', media: bigRef }])
    const zip = await zipStore([
      { name: BACKUP_JSON, blob: new Blob([JSON.stringify(S)]) },
      { name: `media/${main.hash}.jpg`, blob: new Blob([tampered]) },
      { name: `media/${htmlRef.hash}.jpg`, blob: new Blob([html]) },
      { name: `media/${bigRef.hash}.jpg`, blob: new Blob([big]) }
    ])
    const read = await readBackupFile(new File([zip], 'b.zip'))
    const media = createMediaStore(memoryBackend())
    expect(await storeBackupMedia(read.files, { media })).toEqual({ stored: 0, skipped: 3 })
    expect(await media.list()).toEqual([])
  })

  it('a JSON backup reads as before, with its refs and links through the same gates', async () => {
    const S = stateWith([{ id: 'a', media: { kind: 'image', hash: 'nope' }, url: 'javascript:alert(1)' }, { id: 'b', media: await refFor(jpeg(), 'image/jpeg') }])
    const read = await readBackupFile(new File([JSON.stringify(S)], 'b.json', { type: 'application/json' }))
    expect(read.zip).toBe(false)
    expect(read.files).toEqual([])
    expect(read.state.customEx[0]).toEqual({ id: 'a' })
    expect(read.state.customEx[1].media.mime).toBe('image/jpeg')
  })

  it('refuses what is not an openGym backup, zipped or not', async () => {
    await expect(readBackupFile(new File(['{"hello":1}'], 'x.json'))).rejects.toThrow()
    const zip = await zipStore([{ name: 'something.txt', blob: new Blob(['x']) }])
    await expect(readBackupFile(new File([zip], 'x.zip'))).rejects.toThrow()
  })

  it('sanitizeCustomMedia leaves a state without custom exercises alone', () => {
    expect(sanitizeCustomMedia({ workouts: [] })).toEqual({ workouts: [] })
  })
})
