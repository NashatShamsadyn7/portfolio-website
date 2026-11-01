(() => {
  'use strict';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // "31 Oct 2026" reads the same everywhere, unlike 10/09/2026
  function dateLabel(value) { const date = new Date(value); return Number.isFinite(date.valueOf()) ? `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : null; }
  function releaseUrl(value) { try { const url=new URL(value); return url.protocol==='https:' && url.hostname==='github.com' ? url.href : null; } catch { return null; } }
  const fmtMB = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

  fetch('app-updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Updates unavailable');return r.json();}).then(data=>{
    if(!Array.isArray(data.updates)) return;
    const updates=data.updates.filter(u=>u && typeof u.name==='string' && dateLabel(u.releasedAt) && releaseUrl(u.url)).sort((a,b)=>Date.parse(b.releasedAt)-Date.parse(a.releasedAt));
    const latest=updates[0]; if(!latest) return;
    const anchor=document.getElementById('latestAppUpdate'); const name=document.getElementById('latestAppUpdateName'); const date=document.getElementById('latestAppUpdateDate');
    if(!anchor || !name || !date) return;
    name.textContent=`${latest.name} · ${latest.version}`; date.textContent=`Updated ${dateLabel(latest.releasedAt)}`; anchor.href=releaseUrl(latest.url);
    const projectCards={'epulab':'dl-epulab','nashat-tv-mobile':'dl-tv','islamic-nashat-mobile':'dl-islamic','nashat-tv-pc':'dl-tvpc','islamic-nashat-pc':'dl-widget','imposter-game':'dl-imposter','domina-score-counter':'dl-domina','speechflow':'dl-speech','nashat-vpn':'dl-vpn'};
    const seen=new Set();
    for(const update of updates){ if(seen.has(update.projectId)) continue; seen.add(update.projectId); const card=document.getElementById(projectCards[update.projectId]||''); if(!card || card.querySelector('.app-updated-date')) continue; const text=document.createElement('span'); text.className='app-updated-date'; text.textContent=`Updated ${dateLabel(update.releasedAt)}`; card.append(text); }
  }).catch(()=>{/* Keep the last verified release visible when the feed cannot load. */});

  // EpuLab ships from its own releases repo — follow its newest Setup build
  const epu = document.getElementById('dl-epulab');
  if (!epu) return;
  const KEY = 'epulab-latest-v1';
  function paint(rel) {
    const setup = (rel.assets || []).find(a => /-Setup-x64\.exe$/i.test(a.name));
    if (!setup) return;
    const ver = (rel.tag_name || '').replace(/^v/, '');
    const size = fmtMB(setup.size);
    const btn = epu.querySelector('.btn-dl');
    if (btn) btn.href = setup.browser_download_url;
    [epu.querySelector('.dl-size b'), epu.querySelector('.btn-dl-size')].forEach(el => { if (el) el.textContent = size; });
    const verEl = epu.querySelector('.dl-version b');
    if (verEl && ver) verEl.textContent = ver;
    const hash = epu.querySelector('.dl-hash code');
    const digest = /^sha256:([0-9a-f]{16})/.exec(setup.digest || '');
    if (hash && digest) hash.textContent = `${digest[1]}…`;
    document.querySelectorAll('[data-epulab-ver]').forEach(el => { if (ver) el.textContent = `v${ver.replace('-', ' ')}`; });
    document.querySelectorAll('[data-epulab-size]').forEach(el => { el.textContent = size; });
  }
  try { const c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.at < 30 * 60 * 1000) { paint(c.rel); return; } } catch {}
  fetch('https://api.github.com/repos/NashatShamsadyn7/EpuLab-releases/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(rel => {
      const slim = { tag_name: rel.tag_name, assets: (rel.assets || []).map(a => ({ name: a.name, size: a.size, digest: a.digest, browser_download_url: a.browser_download_url })) };
      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rel: slim })); } catch {}
      paint(slim);
    })
    .catch(() => { /* offline or rate-limited — the static card stands */ });
})();
