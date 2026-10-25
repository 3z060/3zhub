// تلخيص عربي مجاني عبر GitHub Models (يستخدم نفس GITHUB_TOKEN مع صلاحية models: read)
// لو انتهى الحد المجاني أو فشل الطلب، نكمل بدون ذكاء اصطناعي ونعيد المحاولة في التشغيل القادم.

import { CATEGORIES } from './categories.mjs';

const ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODEL = process.env.AI_MODEL || 'openai/gpt-4.1-mini';
const CAT_LIST = CATEGORIES.map((c) => `${c.id} (${c.name})`).join(', ');

const SYSTEM = `أنت محرر تقني عربي. تقرأ معلومات مستودع GitHub وتكتب عنه بالعربية الفصحى المبسطة لمطور عربي.
أعد JSON فقط بهذا الشكل:
{"summary":"جملتان: ما هي الأداة وما المشكلة التي تحلها",
 "features":["ميزة قصيرة", "... من 3 إلى 6"],
 "use_cases":["حالة استخدام عملية", "... 2 إلى 4"],
 "how_to":["خطوة 1 لتشغيلها والاستفادة منها", "... 3 إلى 6 خطوات، اذكر الأوامر بين علامتي \` \`"],
 "category":"معرّف مجال واحد من: ${CAT_LIST}"}
لا تخترع أوامر غير موجودة في النص. أسماء الأدوات والأوامر تبقى بالإنجليزية.`;

async function ask(it) {
  const context = [
    `الاسم: ${it.full_name}`,
    `الوصف: ${it.description}`,
    `اللغة: ${it.language}`,
    `الوسوم: ${it.topics.join(', ')}`,
    `README:\n${it._md || [it.readme?.excerpt, ...(it.readme?.features || []), ...(it.readme?.install || []).map((c) => c.code)].join('\n')}`,
  ].join('\n');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: context.slice(0, 8000) }],
    }),
  });
  if (!res.ok) {
    const err = new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json().catch(() => {
    throw Object.assign(new Error('استجابة غير متوقعة من الخدمة'), { status: 0, fatal: true });
  });
  const out = JSON.parse(json.choices[0].message.content);
  const arr = (x) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string').slice(0, 6) : []);
  return {
    summary: String(out.summary || '').slice(0, 500),
    features: arr(out.features),
    use_cases: arr(out.use_cases),
    how_to: arr(out.how_to),
    category: CATEGORIES.some((c) => c.id === out.category) ? out.category : '',
  };
}

export async function enrichWithAI(items, max) {
  // الأولوية للأدوات الأحدث ظهوراً ثم الأكثر نجوماً
  const todo = items
    .filter((it) => !it.ai && it.readme)
    .sort((a, b) => b.first_seen.localeCompare(a.first_seen) || b.stars - a.stars)
    .slice(0, max);
  let done = 0;
  for (const it of todo) {
    try {
      it.ai = await ask(it);
      done++;
    } catch (e) {
      console.warn(`AI: ${it.full_name} — ${e.message}`);
      if (e.fatal || [401, 403, 429].includes(e.status)) break; // انتهى الحد أو لا توجد صلاحية
    }
  }
  console.log(`لُخّصت ${done} أداة بالذكاء الاصطناعي`);
}
