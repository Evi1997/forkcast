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
  checkForUpdate();
});
// Home-screen apps resume without reloading, so look for a newer version on
// launch and on every return to the app, and switch to it when nothing is open.
async function checkForUpdate(){
  try {
    const v = (await (await fetch('version.txt', { cache:'no-store' })).text()).trim();
    if (!v || v === BUILD) return;
    if (S.sheet || S.ob || Object.values(S.busy).some(Boolean) || document.activeElement?.matches('input,textarea')) { S.updateReady = true; return; }
    // Once per version, so a briefly stale copy of the page can't cause a reload loop.
    if (sessionStorage.getItem('fc-reloaded') === v) return;
    sessionStorage.setItem('fc-reloaded', v); location.reload();
  } catch {}
}
setTimeout(checkForUpdate, 3000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
