(() => {
  'use strict';
  function dateLabel(value) { const date = new Date(value); return Number.isFinite(date.valueOf()) ? `${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}/${date.getUTCFullYear()}` : null; }
  function releaseUrl(value) { try { const url=new URL(value); return url.protocol==='https:' && url.hostname==='github.com' ? url.href : null; } catch { return null; } }
  fetch('app-updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Updates unavailable');return r.json();}).then(data=>{
    if(!Array.isArray(data.updates)) return;
    const updates=data.updates.filter(u=>u && typeof u.name==='string' && dateLabel(u.releasedAt) && releaseUrl(u.url)).sort((a,b)=>Date.parse(b.releasedAt)-Date.parse(a.releasedAt));
    const latest=updates[0]; if(!latest) return;
    const anchor=document.getElementById('latestAppUpdate'); const name=document.getElementById('latestAppUpdateName'); const date=document.getElementById('latestAppUpdateDate');
    if(!anchor || !name || !date) return;
    name.textContent=`${latest.name} · ${latest.version}`; date.textContent=`This app was updated on ${dateLabel(latest.releasedAt)}`; anchor.href=releaseUrl(latest.url);
    const projectAssets={'nashat-tv-mobile':'Nashat-TV.apk','islamic-nashat-mobile':'Islamic-Nashat.apk','nashat-tv-pc':'Nashat-TV-Desktop-Setup.exe','islamic-nashat-pc':'IslamicNashatWidget.exe','imposter-game':'Saxtakar-Imposter.apk','domina-score-counter':'Domina-Score-Counter.apk'};
    const seen=new Set();
    for(const update of updates){ if(seen.has(update.projectId)) continue; seen.add(update.projectId); const asset=projectAssets[update.projectId]; const card=asset && [...document.querySelectorAll('[data-asset]')].find(el=>el.dataset.asset===asset)?.closest('.dl-item'); if(!card) continue; const text=document.createElement('span'); text.className='app-updated-date'; text.textContent=`Updated ${dateLabel(update.releasedAt)}`; card.append(text); }
  }).catch(()=>{/* Keep the last verified release visible when the feed cannot load. */});
})();
