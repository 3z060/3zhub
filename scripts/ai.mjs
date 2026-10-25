// تلخيص عربي عبر Google Gemini (الخطة المجانية) — Interactions API
// يحتاج GEMINI_API_KEY في Secrets المستودع. لو انتهى الحد اليومي نكمل بدون ملخص ونعيد المحاولة لاحقاً.
// ملاحظة: بيانات الخطة المجانية قد تستخدمها Google لتحسين منتجاتها؛ ما نرسله هو محتوى README عام فقط.

import { CATEGORIES } from './categories.mjs';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = process.env.AI_MODEL || 'gemini-3.8-flash';
const GAP_MS = 7000; // الخطة المجانية محدودة الطلبات في الدقيقة
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM = `أنت محرر تقني عربي. تقرأ معلومات مستودع GitHub وتكتب عنه بالعربية الفصحى المبسطة لمطور عربي.
- summary: جملتان أو ثلاث: ما هي الأداة، وما المشكلة التي تحلها، ولمن تفيد.
- features: من 3 إلى 6 مميزات قصيرة.
- use_cases: من 2 إلى 4 حالات استخدام عملية.
- how_to: من 3 إلى 6 خطوات لتشغيلها والاستفادة منها، والأوامر بين علامتي \` \`.
- category: مجال واحد يناسب الأداة.
لا تخترع أوامر أو مميزات غير موجودة في النص. أسماء الأدوات والأوامر تبقى بالإنجليزية.`;

const list = (desc) => ({ type: 'array', items: { type: 'string' }, description: desc });
const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    features: list('مميزات الأداة'),
    use_cases: list('حالات الاستخدام'),
    how_to: list('خطوات الاستخدام'),
    category: { type: 'string', enum: CATEGORIES.map((c) => c.id) },
  },
  required: ['summary', 'features', 'use_cases', 'how_to', 'category'],
};

async function ask(it) {
  const context = [
    `الاسم: ${it.full_name}`,
    `الوصف: ${it.description}`,
    `اللغة: ${it.language}`,
    `الوسوم: ${it.topics.join(', ')}`,
    `README:\n${it._md || [it.readme?.excerpt, ...(it.readme?.features || []), ...(it.readme?.install || []).map((c) => c.code)].join('\n')}`,
  ].join('\n').slice(0, 9000);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      system_instruction: SYSTEM,
      input: context,
      response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
      store: false,
    }),
  });
  if (!res.ok) {
    const err = new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json.status && !['completed', 'incomplete'].includes(json.status)) {
    throw Object.assign(new Error(`حالة ${json.status}: ${JSON.stringify(json.errors || []).slice(0, 200)}`), { status: 0 });
  }
  const text = (json.steps || [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
  const out = JSON.parse(text);
  const arr = (x) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string').slice(0, 6) : []);
  return {
    summary: String(out.summary || '').slice(0, 600),
    features: arr(out.features),
    use_cases: arr(out.use_cases),
    how_to: arr(out.how_to),
    category: CATEGORIES.some((c) => c.id === out.category) ? out.category : '',
  };
}

export async function enrichWithAI(items, max) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY غير مضبوط — تخطي الملخص الذكي');
    return;
  }
  // الأولوية للأدوات الأحدث ظهوراً ثم الأكثر نجوماً، ونتجاهل الأدوات المشبوهة
  const todo = items
    .filter((it) => !it.ai && it.readme && !it.flags?.length)
    .sort((a, b) => b.first_seen.localeCompare(a.first_seen) || b.stars - a.stars)
    .slice(0, max);
  let done = 0;
  for (const it of todo) {
    try {
      it.ai = await ask(it);
      done++;
    } catch (e) {
      console.warn(`AI: ${it.full_name} — ${e.message}`);
      if ([400, 401, 403, 404, 429].includes(e.status)) break; // مفتاح خاطئ أو انتهى الحد
    }
    await sleep(GAP_MS);
  }
  console.log(`لُخّصت ${done} أداة بالذكاء الاصطناعي (${MODEL})`);
}
