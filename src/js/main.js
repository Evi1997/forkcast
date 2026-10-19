// Boot: connect sign-in, restore the last tab, register the offline worker
S.sample = AI;
try { const v = localStorage.getItem(LS + 'view'); if (v && TABS.some(t => t[0] === v)) S.view = v; } catch {}
if (Auth.init()) Auth.start(); else render();
addEventListener('online', render); addEventListener('offline', render);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
