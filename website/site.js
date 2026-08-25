// Behaviour for the openGym site: the phone menu, the scroll reveals, the demo frame,
// and the two things that come from the GitLab API (repo counts, release timeline).
// Every one of them fails soft — the page is complete without any of this running.

const GL_PROJECT = 'https://gitlab.com/api/v4/projects/DuarteSantos8%2Fopengym'

/* ------------------------------------------------------------------ phone menu */
;(() => {
  const btn = document.querySelector('.nav-toggle')
  const menu = document.getElementById('menu')
  if (!btn || !menu) return

  const close = () => {
    menu.classList.remove('open')
    btn.setAttribute('aria-expanded', 'false')
    // menu-open drives the dimming scrim; overflow keeps the page still underneath.
    document.body.classList.remove('menu-open')
    document.body.style.overflow = ''
  }
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open')
    btn.setAttribute('aria-expanded', String(open))
    document.body.classList.toggle('menu-open', open)
    // The sheet scrolls on its own; letting the page scroll behind it is the classic
    // mobile-menu bug where the reader loses their place on close.
    document.body.style.overflow = open ? 'hidden' : ''
  })
  // The scrim is body::after, so it has no element of its own to listen on — a tap
  // that lands outside both the sheet and the button is a tap on the scrim.
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('menu-open')) return
    if (e.target.closest('#menu') || e.target.closest('.nav-toggle')) return
    close()
  })
  // Tapping a link inside the sheet navigates, so the sheet has to get out of the way —
  // in-page anchors especially, which do not reload anything.
  menu.addEventListener('click', e => { if (e.target.closest('a')) close() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close() })
  // Rotating to landscape can widen past the breakpoint while the sheet is open, which
  // would leave the body scroll-locked with no visible sheet to close.
  addEventListener('resize', () => { if (innerWidth > 780) close() })
})()

/* --------------------------------------------------------------- scroll reveal */
;(() => {
  const items = document.querySelectorAll('.rv')
  if (!items.length) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('in')
      obs.unobserve(e.target)          // one-way: nothing re-hides on the way back up
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: .06 })
  items.forEach(el => io.observe(el))
})()

/* ------------------------------------------------------------------ demo frame
   The demo is the whole frontend bundle. It is only worth loading when the framed
   phone is actually on screen, and never on a narrow viewport, where the CSS hides
   the frame in favour of a plain "open it full-screen" card. */
;(() => {
  const slot = document.querySelector('[data-demo]')
  if (!slot) return

  const mount = () => {
    if (slot.dataset.mounted) return
    if (!slot.offsetParent) return                 // frame hidden — phone layout
    slot.dataset.mounted = '1'
    const f = document.createElement('iframe')
    f.src = slot.dataset.demo
    f.title = 'openGym live demo'
    f.loading = 'lazy'
    f.style.cssText = 'width:100%;height:100%;border:0;display:block;border-radius:34px;background:#000'
    slot.appendChild(f)
  }

  if (!('IntersectionObserver' in window)) { mount(); return }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) if (e.isIntersecting) { mount(); obs.disconnect() }
  }, { rootMargin: '600px' })                      // load just before it scrolls into view
  io.observe(slot)
  // A rotation or a resized window can reveal the frame long after that first check.
  addEventListener('resize', mount, { passive: true })
})()

/* ------------------------------------------------------- repo counts (nav + specs)
   Points at gitlab.com while the GitHub account is suspended; switch the two API URLs
   back to api.github.com once it is restored.

   The cache keys carry a _gl suffix: a visitor with a still-warm sessionStorage entry
   from the gitea era would otherwise be read with the old field names and show NaN. */
;(async () => {
  const set = (id, v) => document.querySelectorAll('[data-gh="' + id + '"]').forEach(el => { el.textContent = v })
  try {
    let d = null
    const cached = sessionStorage.getItem('repo_meta_gl')
    if (cached) d = JSON.parse(cached)
    else {
      const r = await fetch(GL_PROJECT)
      if (!r.ok) return
      const j = await r.json()
      // An unauthenticated project response carries star_count and forks_count and nothing
      // else countable — open_issues_count is only there for a logged-in caller, so reading
      // it here printed "undefined" on the live site. The issues endpoint answers it in the
      // X-Total header instead, and GitLab lists that header in Access-Control-Expose-Headers,
      // so the browser is allowed to read it. per_page=1 keeps the body to a single issue.
      let issues = ''
      try {
        const ri = await fetch(GL_PROJECT + '/issues?state=opened&per_page=1')
        if (ri.ok) issues = ri.headers.get('X-Total') || ''
      } catch (e) { /* count stays blank rather than wrong */ }
      d = { stars_count: j.star_count, forks_count: j.forks_count, open_issues_count: issues }
      sessionStorage.setItem('repo_meta_gl', JSON.stringify(d))
    }
    set('stars', '★ ' + d.stars_count)
    set('stars-n', d.stars_count)
    set('forks-n', d.forks_count)
    // Leave the placeholder standing rather than writing an empty box.
    if (d.open_issues_count !== '' && d.open_issues_count != null) set('issues-n', d.open_issues_count)
  } catch (e) { /* offline / rate-limited — leave placeholders */ }
})()

/* -------------------------------------------------------------- about timeline
   Built from the published GitLab releases, so the page updates itself with every
   release. The static entries marked data-fallback stay in place when the API is
   unreachable; the hand-written first entry is always kept.

   GitLab's release objects differ from Gitea's: the notes are `description` (not `body`),
   the date is `released_at` (not `published_at`), the web link sits in `_links.self`, and
   there is no draft/prerelease pair — a not-yet-released one is `upcoming_release`. */
;(async () => {
  const tl = document.getElementById('milestones')
  if (!tl) return
  try {
    let rel = null
    const cached = sessionStorage.getItem('repo_releases_gl')
    if (cached) rel = JSON.parse(cached)
    else {
      const r = await fetch(GL_PROJECT + '/releases?per_page=100')
      if (!r.ok) return
      rel = (await r.json()).filter(x => !x.upcoming_release)
        .map(x => ({ tag: x.tag_name, name: x.name, at: x.released_at, body: x.description || '', url: (x._links && x._links.self) || ('https://gitlab.com/DuarteSantos8/opengym/-/releases/' + x.tag_name) }))
      sessionStorage.setItem('repo_releases_gl', JSON.stringify(rel))
    }
    if (!rel.length) return
    const fmt = d => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    // first paragraph of the notes (hard-wrapped lines rejoined), markdown crudely stripped
    const blurb = md => {
      const lines = md.replace(/\r/g, '').split('\n')
      let start = lines.findIndex(l => l.trim() && !l.trim().startsWith('#'))
      if (start < 0) return ''
      let para = []
      for (let i = start; i < lines.length && lines[i].trim(); i++) para.push(lines[i].trim())
      const txt = para.join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>]/g, '')
      return txt.length > 220 ? txt.slice(0, 217).replace(/\s+\S*$/, '') + '…' : txt
    }
    tl.querySelectorAll('[data-fallback]').forEach(el => el.remove())
    for (const x of rel.slice().reverse()) {   // oldest → newest, matching the timeline
      const li = document.createElement('li')
      const title = x.name && x.name !== x.tag ? x.name : x.tag
      li.innerHTML = '<b></b><span class="when"></span><p></p>'
      li.querySelector('b').textContent = title.startsWith(x.tag) ? title : x.tag + ' — ' + title
      li.querySelector('.when').textContent = fmt(x.at)
      const p = li.querySelector('p')
      p.textContent = blurb(x.body) + ' '
      const a = document.createElement('a')
      a.href = x.url; a.rel = 'noopener'; a.textContent = 'notes →'
      p.appendChild(a)
      tl.appendChild(li)
    }
  } catch (e) { /* fallback entries stay */ }
})()

/* The "and the rest of it" rail: arrows for pointers that cannot swipe. The cards are plain
   reading, so there is nothing to activate on them. */
;(() => {
  const rail = document.querySelector('.frail')
  if (!rail) return
  const nav = document.querySelector('.frail-nav')
  if (nav) {
    nav.hidden = false
    const [prev, next] = nav.querySelectorAll('.rnav')
    const step = () => (rail.querySelector('.fcard')?.offsetWidth || 260) + 16
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.rnav')
      if (btn) rail.scrollBy({ left: Number(btn.dataset.dir) * step(), behavior: 'smooth' })
    })
    const sync = () => {
      prev.disabled = rail.scrollLeft < 4
      next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 4
    }
    rail.addEventListener('scroll', sync, { passive: true })
    addEventListener('resize', sync)
    sync()
  }
})()

/* The hero intro is armed in the inline <head> script, before the first paint — a deferred
   script would arm it too late and the hero would flash. All this does is take the class off
   once the last element has landed, so nothing stays mid-animation. */
;(() => {
  const root = document.documentElement
  if (!root.classList.contains('intro')) return
  const done = () => root.classList.remove('intro')
  const last = document.querySelector('.hero-stage') || document.querySelector('.hero .actions')
  if (last) last.addEventListener('animationend', done, { once: true })
  setTimeout(done, 2400)   // if the animation never fires, do not leave the hero hidden
})()
