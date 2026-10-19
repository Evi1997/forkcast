// Boot
loadLocal();
try { const v = localStorage.getItem(LS + 'view'); if (v && TABS.some(t => t[0] === v)) S.view = v; } catch {}
render();
syncRemote();
initSample();
