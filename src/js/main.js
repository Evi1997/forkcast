// Boot: connect sign-in, restore the last tab, register the offline worker
S.sample = AI;
try { const v = localStorage.getItem(LS + 'view'); if (v && TABS.some(t => t[0] === v)) S.view = v; } catch {}
if (Auth.init()) Auth.start(); else render();
addEventListener('online', render); addEventListener('offline', render);
// Phones keep the app alive in the background, so pull the latest data from
// your account whenever the app comes back to the front (e.g. after using the laptop).
let lastSync = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || S.auth.status !== 'signed-in' || Date.now() - lastSync < 15000) return;
  lastSync = Date.now();
  syncRemote();
  navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
