// يجلب أحدث الأدوات من GitHub، يصنفها، يستخرج أكوادها، ويكتب site/data/repos.json
// ثم يرسل تنبيهات فورية (ntfy) لكل مجال فيه أدوات جديدة.
//
// المتغيرات:
//   GITHUB_TOKEN   مطلوب (في GitHub Actions يُعطى تلقائياً، ومحلياً: gh auth token)
//   PREV_DATA      رابط أو مسار البيانات السابقة لمعرفة الجديد (اختياري)
//   NTFY_PREFIX    بادئة قنوات التنبيه، مثال: 3zhub-x7k2 (اختياري؛ بدونها لا تُرسل تنبيهات)
//   USE_AI         true لاستخدام GitHub Models المجانية في التلخيص بالعربي
//   APP_PASSWORD   كلمة مرور التطبيق: إذا وُجدت تُنشر البيانات مشفرة فقط (repos.enc.json)
//   MAX_AI         أقصى عدد أدوات تُلخص بالذكاء الاصطناعي في كل تشغيل (افتراضي 12)

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, classify } from './categories.mjs';
import { parseReadme } from './readme.mjs';
import { enrichWithAI } from './ai.mjs';
import { translateItems } from './translate.mjs';
import { decryptJSON, encryptJSON } from './crypto.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'data', 'repos.json');
const OUT_ENC = join(ROOT, 'site', 'data', 'repos.enc.json');
const TOKEN = process.env.GITHUB_TOKEN;
const PASSWORD = process.env.APP_PASSWORD || '';
const MAX_ITEMS = 500;
const MAX_README_PER_RUN = 450;
const KEEP_DAYS = 30;

// في GitHub Actions نرفض النشر بدون كلمة مرور حتى لا تُنشر البيانات مكشوفة بالخطأ
if (process.env.GITHUB_ACTIONS && !PASSWORD) {
  console.error('::error::APP_PASSWORD غير مضبوط في Secrets المستودع — أوقفنا النشر لحماية التطبيق');
  process.exit(1);
}

if (!TOKEN) {
  console.error('GITHUB_TOKEN مفقود. محلياً شغّل: GITHUB_TOKEN=$(gh auth token) npm run build');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

async function gh(path, { raw = false } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': '3zhub',
      },
    });
    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
      const wait = Math.min(Math.max(reset - Date.now(), 5000), 65_000);
      console.warn(`حد الطلبات (${path.slice(0, 60)}) — انتظار ${Math.round(wait / 1000)}ث`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return raw ? res.text() : res.json();
  }
  return null;
}

async function loadPrevious() {
  const src = process.env.PREV_DATA || (PASSWORD && existsSync(OUT_ENC) ? OUT_ENC : OUT);
  try {
    const text = /^https?:/.test(src)
      ? await fetch(`${src}?t=${Date.now()}`).then((r) => (r.ok ? r.text() : null))
      : await readFile(src, 'utf8');
    if (!text) return null;
    let data = JSON.parse(text);
    if (data.ct) {
      if (!PASSWORD) return null;
      data = await decryptJSON(data, PASSWORD).catch(() => {
        console.warn('تعذّر فك تشفير البيانات السابقة (تغيّرت كلمة المرور؟) — نبدأ من جديد');
        return null;
      });
      if (!data) return null;
    }
    console.log(`البيانات السابقة: ${data.items.length} أداة`);
    return data;
  } catch {
    return null;
  }
}

// ---------- البحث ----------
function buildQueries() {
  const q = [
    { q: `created:>=${daysAgo(7)} stars:>=10`, pages: 3 },
    { q: `created:>=${daysAgo(2)} stars:>=4`, pages: 1 },
    { q: `created:>=${daysAgo(30)} stars:>=150`, pages: 2 },
  ];
  // استعلام لكل مجال حتى لا يغيب أي مجال
  for (const c of CATEGORIES) if (c.seed) q.push({ q: `topic:${c.seed} created:>=${daysAgo(14)} stars:>=5`, pages: 1 });
  return q;
}

async function searchAll() {
  const found = new Map();
  for (const { q, pages } of buildQueries()) {
    for (let page = 1; page <= pages; page++) {
      const res = await gh(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${page}`);
      const items = res?.items || [];
      for (const r of items) if (!r.fork && !r.archived) found.set(r.full_name, r);
      await sleep(2200); // حد البحث 30 طلب/دقيقة
      if (items.length < 100) break;
    }
  }
  console.log(`نتائج البحث: ${found.size} مستودع`);
  return found;
}

function slim(r, prev) {
  const now = new Date().toISOString();
  return {
    full_name: r.full_name,
    name: r.name,
    owner: r.owner.login,
    avatar: r.owner.avatar_url,
    url: r.html_url,
    homepage: r.homepage || '',
    description: (r.description || '').slice(0, 400),
    language: r.language || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    issues: r.open_issues_count,
    license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
    topics: r.topics || [],
    size_kb: r.size,
    created_at: r.created_at,
    pushed_at: r.pushed_at,
    default_branch: r.default_branch,
    first_seen: prev?.first_seen || now,
    // سرعة الصعود: نجوم لكل يوم منذ الإنشاء
    velocity: Math.round((r.stargazers_count / Math.max((Date.now() - Date.parse(r.created_at)) / 864e5, 0.5)) * 10) / 10,
    cats: classify(r),
    readme: prev?.readme || null,
    // الترجمة تُعاد فقط إذا تغيّر الوصف
    ar: prev?.ar && prev.description === (r.description || '').slice(0, 400) ? prev.ar : null,
    ai: prev?.ai || null,
  };
}

async function fetchReadmes(items) {
  const todo = items.filter((it) => !it.readme).sort((a, b) => b.stars - a.stars).slice(0, MAX_README_PER_RUN);
  console.log(`جلب README لـ ${todo.length} أداة`);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const it = todo[i++];
      try {
        const md = await gh(`/repos/${it.full_name}/readme`, { raw: true });
        it.readme = parseReadme(md, it);
        it._md = md?.slice(0, 7000); // للذكاء الاصطناعي فقط، لا يُحفظ
      } catch (e) {
        console.warn(`README فشل: ${it.full_name} — ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

// ---------- التنبيهات ----------
async function notify(newItems, catsById) {
  const prefix = process.env.NTFY_PREFIX;
  if (!prefix || !newItems.length) return;
  const appUrl = process.env.APP_URL || '';
  const byCat = new Map();
  for (const it of newItems) for (const c of it.cats) (byCat.get(c) || byCat.set(c, []).get(c)).push(it);

  const send = async (topic, title, list) => {
    const top = list.sort((a, b) => b.stars - a.stars).slice(0, 5);
    const lines = top.map((it) => `⭐ ${it.stars}  ${it.full_name}\n${it.ai?.summary || it.ar?.description || it.description || ''}`.slice(0, 220));
    if (list.length > top.length) lines.push(`و ${list.length - top.length} أدوات أخرى…`);
    const body = {
      topic, title, message: lines.join('\n\n'), tags: ['sparkles'],
      click: appUrl ? (top.length === 1 ? `${appUrl}#/repo/${top[0].full_name}` : appUrl) : top[0].url,
    };
    const res = await fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify(body) });
    console.log(`تنبيه ${topic}: ${res.status}`);
  };

  for (const [cat, list] of byCat) {
    const c = catsById[cat];
    await send(`${prefix}-${cat}`, `${c.emoji} جديد في ${c.name} (${list.length})`, list);
  }
  await send(`${prefix}-all`, `✨ 3zhub: ${newItems.length} أداة جديدة`, [...newItems]);
}

// ---------- التشغيل ----------
const prev = await loadPrevious();
const prevMap = new Map((prev?.items || []).map((it) => [it.full_name, it]));
const found = await searchAll();

const merged = new Map();
for (const [name, r] of found) merged.set(name, slim(r, prevMap.get(name)));
// نحتفظ بالأدوات القديمة التي لم تظهر في البحث هذه المرة (حتى ${KEEP_DAYS} يوماً)
const cutoff = Date.now() - KEEP_DAYS * 864e5;
for (const [name, it] of prevMap) {
  if (!merged.has(name) && Date.parse(it.first_seen) > cutoff) merged.set(name, it);
}

let items = [...merged.values()]
  .sort((a, b) => b.stars - a.stars)
  .slice(0, MAX_ITEMS);

await fetchReadmes(items);
await translateItems(items);
if (process.env.USE_AI === 'true') await enrichWithAI(items, Number(process.env.MAX_AI || 12));

const catsById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
// إذا صنّف الذكاء الاصطناعي الأداة، نجعل تصنيفه الأول
for (const it of items) {
  if (it.ai?.category && catsById[it.ai.category]) it.cats = [it.ai.category, ...it.cats.filter((c) => c !== it.ai.category && c !== 'other')].slice(0, 3);
}

const newItems = prev ? items.filter((it) => !prevMap.has(it.full_name)) : [];
console.log(`أدوات جديدة منذ آخر تحديث: ${newItems.length}`);

const data = {
  generated_at: new Date().toISOString(),
  ntfy_prefix: process.env.NTFY_PREFIX || '',
  categories: CATEGORIES.map(({ id, name, emoji }) => ({ id, name, emoji })),
  items,
};
await mkdir(dirname(OUT), { recursive: true });
const clean = JSON.parse(JSON.stringify(data, (k, v) => (k === '_md' ? undefined : v)));
if (PASSWORD) {
  // لا نترك أي نسخة غير مشفرة داخل مجلد الموقع
  await rm(OUT, { force: true });
  await writeFile(OUT_ENC, JSON.stringify(await encryptJSON(clean, PASSWORD)));
  console.log(`✓ كُتب ${items.length} أداة مشفرة إلى site/data/repos.enc.json`);
} else {
  await rm(OUT_ENC, { force: true });
  await writeFile(OUT, JSON.stringify(clean));
  console.log(`✓ كُتب ${items.length} أداة إلى site/data/repos.json (بدون تشفير)`);
}

await notify(newItems, catsById);
