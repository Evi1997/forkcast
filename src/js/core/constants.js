// Icons, tabs, meal slots and consultation sections
const ICONS = {
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"/><path d="M12 8v4l2.5 2"/></svg>',
  coach:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.5c.4 0 .7.3.8.7l.9 3.4a5 5 0 0 0 3.6 3.6l3.4.9a.8.8 0 0 1 0 1.6l-3.4.9a5 5 0 0 0-3.6 3.6l-.9 3.4a.8.8 0 0 1-1.6 0l-.9-3.4a5 5 0 0 0-3.6-3.6l-3.4-.9a.8.8 0 0 1 0-1.6l3.4-.9a5 5 0 0 0 3.6-3.6l.9-3.4c.1-.4.4-.7.8-.7z"/><path d="M18.5 1.5c.2 0 .4.1.4.3l.3 1.1c.2.6.6 1 1.2 1.2l1.1.3a.4.4 0 0 1 0 .8l-1.1.3c-.6.2-1 .6-1.2 1.2l-.3 1.1a.4.4 0 0 1-.8 0l-.3-1.1c-.2-.6-.6-1-1.2-1.2l-1.1-.3a.4.4 0 0 1 0-.8l1.1-.3c.6-.2 1-.6 1.2-1.2l.3-1.1c0-.2.2-.3.4-.3z" opacity=".55"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  shop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  progress:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M5 15l4-4 3 3 7-7"/><path d="M15 7h4v4"/></svg>'
};
const TABS = [['today','Today'],['coach','Dietitian'],['plan','Week plan'],['shop','Shop & prep'],['progress','Progress']];
const SLOTS = ['Breakfast','Lunch','Snack','Dinner'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SECTIONS = [
  ['basics','Body & goal'],['health','Health screening'],['lifestyle','Lifestyle'],
  ['current_diet','Current eating'],['obstacles','Weak points'],['preferences','Food preferences'],['cooking','Cooking & prep'],['shopping','Shopping & budget']
];

// Your dietitian's name and style, chosen in onboarding or About you.
const COACH_NAMES = ['Mila','Theo','Nora','Leo','Ava','Sam'];
const COACH_TONES = [
  ['warm','Warm & encouraging','warm, kind and encouraging'],
  ['direct','Straight to the point','brief, direct and practical; no small talk'],
  ['fun','Friendly & fun','friendly and upbeat with a little light humour, still precise']
];
const coachName = () => String(S.profile.data.coach?.name || 'Mila').trim().slice(0, 20) || 'Mila';
const coachTone = () => COACH_TONES.find(t => t[0] === S.profile.data.coach?.tone) || COACH_TONES[0];
const coachPersona = () => `Your name is ${coachName()}. Your style: ${coachTone()[2]}. Never sign your messages.`;
