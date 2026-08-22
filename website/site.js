// Live repo numbers in the nav + open-source strip. Fails silently — the site works
// fine without them. Points at the gitea.com mirror while the GitHub account is
// suspended; switch the two API URLs back to api.github.com once it is restored.
(async () => {
  const set = (id, v) => document.querySelectorAll('[data-gh="' + id + '"]').forEach(el => { el.textContent = v })
  try {
    let d = null
    const cached = sessionStorage.getItem('repo_meta')
    if (cached) d = JSON.parse(cached)
    else {
      const r = await fetch('https://gitea.com/api/v1/repos/DuarteSantos/openGym')
      if (!r.ok) return
      d = await r.json()
      sessionStorage.setItem('repo_meta', JSON.stringify({ stars_count: d.stars_count, forks_count: d.forks_count, open_issues_count: d.open_issues_count }))
    }
    set('stars', '★ ' + d.stars_count)
    set('stars-n', d.stars_count)
    set('forks-n', d.forks_count)
    set('issues-n', d.open_issues_count)
  } catch (e) { /* offline / rate-limited — leave placeholders */ }
})()

// About page: build the milestones timeline from the published Gitea releases, so the
// page updates itself with every release. The static entries marked data-fallback stay
// in place when the API is unreachable; the hand-written first entry is always kept.
;(async () => {
  const tl = document.getElementById('milestones')
  if (!tl) return
  try {
    let rel = null
    const cached = sessionStorage.getItem('repo_releases')
    if (cached) rel = JSON.parse(cached)
    else {
      const r = await fetch('https://gitea.com/api/v1/repos/DuarteSantos/openGym/releases?limit=100')
      if (!r.ok) return
      rel = (await r.json()).filter(x => !x.draft && !x.prerelease)
        .map(x => ({ tag: x.tag_name, name: x.name, at: x.published_at, body: x.body || '', url: x.html_url }))
      sessionStorage.setItem('repo_releases', JSON.stringify(rel))
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
