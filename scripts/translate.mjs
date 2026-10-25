// ترجمة مجانية إلى العربية (بدون مفتاح) لوصف الأداة ومميزاتها وعناوين الأكواد.
// تُحفظ الترجمة مع الأداة فلا تُترجم مرة أخرى في التشغيلات القادمة.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t';
const SEP = '\n⁂\n';
const AR = /[؀-ۿ]/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateText(text) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: text }),
  });
  if (!res.ok) throw Object.assign(new Error(`ترجمة ${res.status}`), { status: res.status });
  const json = await res.json();
  return json[0].map((p) => p[0]).join('');
}

/** يترجم قائمة نصوص في طلب واحد، ولو اختلف العدد يترجم كل نص وحده */
async function translateMany(list) {
  const out = list.map((s) => (AR.test(s) || !s.trim() ? s : null));
  const todo = list.map((s, i) => [s, i]).filter(([, i]) => out[i] === null);
  if (!todo.length) return out;
  const joined = await translateText(todo.map(([s]) => s).join(SEP));
  const parts = joined.split(/\s*⁂\s*/);
  if (parts.length === todo.length) todo.forEach(([, i], k) => (out[i] = parts[k].trim()));
  else for (const [s, i] of todo) out[i] = (await translateText(s)).trim();
  return out;
}

export async function translateItems(items, max = 500) {
  const todo = items.filter((it) => !it.ar && it.readme).slice(0, max);
  console.log(`ترجمة ${todo.length} أداة إلى العربية`);
  let i = 0;
  let done = 0;
  let stop = false;
  const worker = async () => {
    while (i < todo.length && !stop) {
      const it = todo[i++];
      const r = it.readme;
      const titles = [...new Set([...r.install, ...r.usage].map((c) => c.title))];
      const fields = [it.description, r.excerpt, ...r.features, ...r.requirements, ...titles].map((s) => (s || '').slice(0, 600));
      try {
        const t = await translateMany(fields);
        const f = r.features.length;
        const base = 2 + f + r.requirements.length;
        it.ar = {
          description: t[0],
          excerpt: t[1],
          features: t.slice(2, 2 + f),
          requirements: t.slice(2 + f, base),
          titles: Object.fromEntries(titles.map((x, j) => [x, t[base + j] || x])),
        };
        done++;
      } catch (e) {
        console.warn(`ترجمة: ${it.full_name} — ${e.message}`);
        if (e.status === 429) stop = true; // تجاوزنا الحد، نكمل في التشغيل القادم
      }
      await sleep(150);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`تُرجمت ${done} أداة`);
}
