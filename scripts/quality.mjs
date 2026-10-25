// فلتر الجودة والأمان:
//  - spam: برامج مقرصنة وغش ألعاب وأدوات "executor" — طُعم شائع لنشر البرمجيات الخبيثة، تُستبعد تماماً
//  - fake-stars / empty / tiny: أدوات ضعيفة أو مشبوهة، تُخفى في التطبيق افتراضياً مع إمكانية إظهارها

// «إعداد كامل جاهز» مع سنة الإصدار = نمط نسخ البرامج المقرصنة (بدون السنة قد يكون وصفاً عادياً)
const PIRATE_SETUP = /(complete|full|ready[- ]to[- ]run|working)\b.{0,40}\b(standalone |desktop )?(setup|installer|installation)\b/i;
const YEAR = /\b20[2-3]\d\b/;
// أسماء طُعم مثل «YouTube-Views-Boost-Free-Tool-2026»
const BAIT_NAME = /\b(free|boost(er)?|optimi[sz]er|generator|unlock(er)?|views?|followers?|likes?|lag[- ]fix)\b/i;
const PIRACY = /all features unlocked|\bactivat(or|ion key)\b|\bkms[- ]?pico\b|\bcrack(ed|s)?\b|\bkeygen\b|\b(license|serial|product) keys?\b|\bfree download\b|\bpre-?activated\b/i;
const CHEATS = /\b(aimbot|wallhack|triggerbot|no[- ]?recoil|mod[- ]menu|skin[- ]changer|hwid[- ]spoofer|dll[- ]injector|robux|v-?bucks|external esp|hacks? menu|cheats?(?![- ]?sheets?))\b/i;
// «executor» وحدها اسم شائع لأدوات برمجية سليمة؛ المشبوه هو منفذ سكربتات الألعاب
const GAME_EXECUTOR = /\b(roblox|xeno|krnl|synapse|delta|solara|fluxus|wave)\b.{0,20}\bexecutor\b|\bexecutor[- ](pc|roblox|scripts?)\b/i;
const STEALER = /\b(token[- ]?(grabber|logger)|stealer|grabber|rat builder|botnet|crypter|fud)\b/i;

export function spamReason(r) {
  const text = `${r.name.replace(/[-_]/g, ' ')} ${r.description || ''}`;
  if (PIRACY.test(text) || (PIRATE_SETUP.test(text) && YEAR.test(text))) return 'piracy';
  if (CHEATS.test(text) || GAME_EXECUTOR.test(text)) return 'cheat';
  const name = r.name.replace(/[-_]/g, ' ');
  if (YEAR.test(name) && BAIT_NAME.test(name)) return 'bait';
  if (STEALER.test(text)) return 'malware';
  // مستودعات ".github" التي تُستخدم كصفحات إعلانية بنجوم
  if (r.name === '.github' && r.stargazers_count > 100) return 'promo';
  return '';
}

/** علامات الجودة لأداة بعد جلب README */
export function qualityFlags(it) {
  const flags = [];
  const r = it.readme || {};
  const hasContent = (r.excerpt?.length || 0) > 40 || r.usage?.length || r.features?.length;
  if (!it.description && !hasContent) flags.push('empty');
  // نجوم كثيرة بدون أي نسخ مشتقة أو تفاعل: نمط النجوم المشتراة
  if (it.stars >= 1000 && it.forks / it.stars < 0.005 && it.issues === 0) flags.push('fake-stars');
  // مستودع صغير جداً (بدون كود تقريباً) مع نجوم كثيرة
  if (it.size_kb < 10 && it.stars >= 100 && !r.usage?.length && !/awesome|list/i.test(it.name)) flags.push('tiny');
  return flags;
}
