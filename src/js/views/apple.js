// Your apple: the mascot grows a little every day something is logged. The
// count is days, never a streak: it never shrinks, so a missed day costs nothing.
// (S.profile.leaves keeps its old name so existing counts carry over.)
const APPLE_STAGES = [[0,'Seed'],[1,'Sprout'],[10,'Growing'],[20,'Full crown'],[30,'In blossom'],[50,'First apple']];
const APPLE_NEXT = { 1:'Log a meal and it sprouts.', 10:'At 10 days it starts to grow.', 20:'At 20 days it has a full crown.', 30:'At 30 days it blossoms.', 50:'At 50 days it grows its first apple.' };
const careDays = () => Math.max(S.profile.leaves || 0, (S.profile.loggedDays || []).length);
const appleStage = n => APPLE_STAGES.filter(([m]) => n >= m).pop()[1];
const daysWord = n => n === 1 ? 'day' : 'days';

// Drawn on the device from the count alone: the mascot, with a crown that fills
// in over the first 20 days, a blossom at 30 and a small apple of its own at 50.
function appleSVG(n, size){
  const growth = Math.min(n, 20) / 20, top = 20 - growth * 9;
  const leaf = (x, y, len, ang, fill) => `<path d="M0 0Q${len * .45} ${-len * .45} ${len} 0Q${len * .45} ${len * .32} 0 0z" transform="translate(${x} ${y.toFixed(1)}) rotate(${ang})" fill="${fill}"/>`;
  // Crown spots in the order they fill: the logo leaf first, then out and up.
  const spots = [[33,22,15,-28],[31,22,12,208],[32,18,12,-62],[32,17,11,242],[33,14,10,-15],[31,14,10,195],[32,12,9,-88]];
  const count = n === 0 ? 0 : Math.min(spots.length, 1 + Math.floor(n / 3));
  const crown = spots.slice(0, count).map(([x, y, l, a], i) => leaf(x, Math.max(y, top + 1) + (1 - growth) * 2, l * (.75 + growth * .25), a, i === count - 1 && n < 20 ? 'var(--leaf-new)' : 'var(--leaf)')).join('');
  const stem = `<path d="M32 25V${top.toFixed(1)}" stroke="var(--stem)" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
  const blossom = n >= 30 ? `<g transform="translate(32 ${(top - 1).toFixed(1)})">${[0,72,144,216,288].map(a => `<ellipse rx="2.6" ry="3.8" transform="rotate(${a}) translate(0 -3.6)" fill="#F7B6C8"/>`).join('')}<circle r="2" fill="var(--amber)"/></g>` : '';
  const fruit = n >= 50 ? `<path d="M47 19q2-4 5-4" stroke="var(--stem)" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="53" cy="22" r="6" fill="var(--paprika)"/><ellipse cx="51" cy="20" rx="1.6" ry="1" fill="#fff" opacity=".6"/>` : '';
  const pale = n === 0 ? ' opacity=".55"' : '';
  return `<svg class="apple" width="${size}" height="${size}" viewBox="0 0 64 66" aria-hidden="true">${stem}${crown}${blossom}${fruit}
    <g transform="translate(0 5)"${pale}><ellipse cx="32" cy="38" rx="22" ry="21" fill="#4CC38A"/><ellipse cx="32" cy="44" rx="13" ry="10" fill="#7FD6AC"/><ellipse cx="24.5" cy="34" rx="5" ry="5.6" fill="#fff"/><ellipse cx="39.5" cy="34" rx="5" ry="5.6" fill="#fff"/><circle cx="25.5" cy="35" r="2.6" fill="#10140F"/><circle cx="40.5" cy="35" r="2.6" fill="#10140F"/><circle cx="26.4" cy="34" r=".9" fill="#fff"/><circle cx="41.4" cy="34" r=".9" fill="#fff"/><ellipse cx="18" cy="42" rx="3.2" ry="2" fill="#F48FB1" opacity=".75"/><ellipse cx="46" cy="42" rx="3.2" ry="2" fill="#F48FB1" opacity=".75"/><path d="M27 43.5c2.8 3 7.2 3 10 0" stroke="#10140F" stroke-width="2.2" stroke-linecap="round" fill="none"/></g></svg>`;
}

function appleSheet(){
  const n = careDays(), next = APPLE_STAGES.find(([m]) => m > n), enter = S.appleOpen === 'enter' ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="apple"></div>
  <div class="sheet apple-sheet${enter}" role="dialog" aria-modal="true" aria-label="Your apple">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><h2>Your apple</h2><button class="x close" data-act="apple" aria-label="Close">×</button></div>
    <div class="apple-hero">${appleSVG(n, 150)}
      <b class="num">${n} ${daysWord(n)} logged</b><span class="stage">${appleStage(n)}</span>
      <p class="muted">It grows a little every day you log a meal, and it never shrinks.${next ? ' ' + APPLE_NEXT[next[0]] : ''}</p></div>
    <div class="milestones">${APPLE_STAGES.slice(2).map(([m, l]) => `<span class="${n >= m ? 'got' : ''}"><b class="num">${m}</b>${l}</span>`).join('')}</div>
  </div>`;
}
