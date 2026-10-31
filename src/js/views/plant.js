// The growing plant: one leaf for every day something was logged. It never
// shrinks, so a missed day costs nothing (no streak pressure).
const PLANT_STAGES = [[0,'Seed'],[1,'Sprout'],[10,'Seedling'],[20,'Bush'],[30,'Flower'],[50,'Peppers']];
const PLANT_NEXT = { 1:'Log a meal to grow the first leaf.', 10:'At 10 leaves it becomes a seedling.', 20:'At 20 it grows into a bush.', 30:'At 30 it flowers.', 50:'At 50 it grows peppers.' };
const leafCount = () => Math.max(S.profile.leaves || 0, (S.profile.loggedDays || []).length);
const plantStage = n => PLANT_STAGES.filter(([m]) => n >= m).pop()[1];

// Drawn on the device from the count alone: a stem with pointed leaves, side
// branches from 10 leaves, a flower at 30 and peppers at 50. Newest leaf is lighter.
function plantSVG(n, size){
  const h = Math.min(16 + n * 2.2, 70), base = 100, top = base - h;
  const leaf = (x, y, len, ang) => `<path d="M0 0Q${len * .45} ${-len * .42} ${len} 0Q${len * .45} ${len * .3} 0 0z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang})"/>`;
  const list = [], len = 11 + Math.min(n, 30) * .3;
  // Leaves on the main stem, alternating sides, the top pair pointing upwards.
  const main = Math.min(n, 7);
  for (let i = 0; i < main; i++) { const t = (i + 1) / (main + .6), side = i % 2 ? 1 : -1; list.push([50, base - t * h, len * (1.05 - t * .3), side > 0 ? -28 - t * 30 : 208 + t * 30]); }
  // Branches: one pair from 10 leaves, a second pair from 20; up to 4 leaves each.
  const branches = [];
  [[10, .45, 24], [20, .25, 30]].forEach(([from, at, full]) => { if (n < from) return;
    [-1, 1].forEach((side, k) => { const per = Math.min(4, Math.ceil((n - from + 1 - k) / 2)); if (per < 1) return;
      const reach = full * (.45 + .55 * per / 4), sy = base - at * h, ex = 50 + side * reach, ey = sy - reach * .8;
      branches.push(`<path d="M50 ${sy.toFixed(1)}Q${50 + side * reach * .55} ${(sy - 2).toFixed(1)} ${ex} ${ey.toFixed(1)}" stroke="var(--stem)" stroke-width="2.4" stroke-linecap="round" fill="none"/>`);
      for (let j = 0; j < per; j++) { const t = (j + 1) / per, x = 50 + side * reach * t, y = sy - reach * .8 * t * t; list.push([x, y, len * .8, j % 2 ? (side > 0 ? -70 : 250) : (side > 0 ? 10 : 170)]); }
    }); });
  const leaves = list.map(([x, y, l, a], i) => `<g fill="${i === list.length - 1 ? 'var(--leaf-new)' : 'var(--leaf)'}">${leaf(x, y, l, a)}</g>`).join('');
  const flower = n >= 30 ? `<g transform="translate(50 ${top - 3})">${[0,72,144,216,288].map(a => `<ellipse rx="4.4" ry="7" transform="rotate(${a}) translate(0 -6.5)" fill="var(--paprika)"/>`).join('')}<circle r="4.2" fill="var(--amber)"/></g>` : '';
  const fruit = n >= 50 ? [-1, 1].map(sd => { const x = 50 + sd * 20, y = base - .45 * h - 6; return `<path d="M${x} ${y}c${sd * 5} 1 ${sd * 6} 9 ${sd * 2} 15c${-sd * 4} -2 ${-sd * 6} -9 ${-sd * 2} -15z" fill="var(--paprika)"/>`; }).join('') : '';
  const stem = n === 0 ? '<ellipse cx="50" cy="98" rx="4" ry="2.6" fill="var(--amber)"/>' : `<path d="M50 101V${top.toFixed(1)}" stroke="var(--stem)" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  return `<svg class="plant" width="${size}" height="${size * 1.2}" viewBox="${size < 48 ? '10 13 80 107' : '0 0 100 120'}" aria-hidden="true">${stem}${branches.join('')}${leaves}${fruit}${flower}
    <path d="M34 101h32l-3 16a3 3 0 0 1-3 2.5H40a3 3 0 0 1-3-2.5z" fill="var(--pot)"/><rect x="31" y="97" width="38" height="7" rx="3" fill="var(--pot-rim)"/></svg>`;
}

function plantSheet(){
  const n = leafCount(), next = PLANT_STAGES.find(([m]) => m > n), enter = S.plantOpen === 'enter' ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="plant"></div>
  <div class="sheet plant-sheet${enter}" role="dialog" aria-modal="true" aria-label="Your plant">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><h2>Your plant</h2><button class="x close" data-act="plant" aria-label="Close">×</button></div>
    <div class="plant-hero">${plantSVG(n, 150)}
      <b class="num">${n} ${n === 1 ? 'leaf' : 'leaves'}</b><span class="stage">${plantStage(n)}</span>
      <p class="muted">A new leaf for every day you log. It never shrinks.${next ? ' ' + PLANT_NEXT[next[0]] : ''}</p></div>
    <div class="milestones">${PLANT_STAGES.slice(2).map(([m, l]) => `<span class="${n >= m ? 'got' : ''}"><b class="num">${m}</b>${l}</span>`).join('')}</div>
  </div>`;
}
