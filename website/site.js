// Live repo numbers in the nav + open-source strip. Fails silently — the site works
// fine without them. Points at gitlab.com while the GitHub account is suspended;
// switch the two API URLs back to api.github.com once it is restored.
//
// The cache keys carry a _gl suffix: a visitor with a still-warm sessionStorage entry
// from the gitea era would otherwise be read with the old field names and show NaN.
const GL_PROJECT = 'https://gitlab.com/api/v4/projects/DuarteSantos8%2Fopengym'

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

// About page: build the milestones timeline from the published GitLab releases, so the
// page updates itself with every release. The static entries marked data-fallback stay
// in place when the API is unreachable; the hand-written first entry is always kept.
//
// GitLab's release objects differ from Gitea's: the notes are `description` (not `body`),
// the date is `released_at` (not `published_at`), the web link sits in `_links.self`, and
// there is no draft/prerelease pair — a not-yet-released one is `upcoming_release`.
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
