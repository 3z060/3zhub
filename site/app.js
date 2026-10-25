// 3zhub — واجهة التطبيق
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');

const store = {
  get(k, d) { try { const v = localStorage.getItem('3z:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('3z:' + k, JSON.stringify(v)); } catch {} },
};

const state = {
  data: null,
  byName: new Map(),
  myCats: store.get('myCats', []),
  alertCats: store.get('alertCats', []),
  saved: store.get('saved', []),
  sort: store.get('sort', 'new'),
  hideCJK: store.get('hideCJK', true),
  cat: 'all',
  query: '',
  shown: 40,
  prevVisit: store.get('lastVisit', 0),
};
store.set('lastVisit', Date.now());

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', Go: '#00ADD8', Rust: '#dea584',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF',
  Dart: '#00B4AB', Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c',
  Vue: '#41b883', Svelte: '#ff3e00', Lua: '#000080', Zig: '#ec915c', 'Jupyter Notebook': '#DA5B0B',
  Elixir: '#6e4a7e', Scala: '#c22d40', Nix: '#7e7eff', MDX: '#fcb32c', Solidity: '#AA6746',
};

const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inlineMd = (s) => esc(s).replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
const isArabic = (s) => /[؀-ۿ]/.test(s || '');
const isCJK = (s) => /[぀-ヿ㐀-鿿가-힯]/.test(s || '');

function ago(iso) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return 'الآن';
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ---------- البيانات ----------
async function loadData(force = false) {
  const btn = $('#btn-refresh');
  btn.classList.add('spin');
  try {
    const res = await fetch('data/repos.json' + (force ? `?t=${Date.now()}` : ''), { cache: force ? 'reload' : 'default' });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
    state.byName = new Map(state.data.items.map((it) => [it.full_name, it]));
    if (force) toast(`تم التحديث · ${ago(state.data.generated_at)}`);
  } catch (e) {
    if (!state.data) view.innerHTML = `<div class="empty"><span class="big">📡</span>تعذّر تحميل البيانات. تأكد من الاتصال ثم اضغط تحديث.</div>`;
    else toast('تعذّر التحديث، تعرض آخر نسخة محفوظة');
  } finally {
    btn.classList.remove('spin');
  }
}

const catMeta = (id) => state.data?.categories.find((c) => c.id === id) || { id, name: id, emoji: '📦' };
const isNew = (it) => state.prevVisit && Date.parse(it.first_seen) > state.prevVisit;
const summaryOf = (it) => it.ai?.summary || it.description || it.readme?.excerpt || '';

function filtered(items) {
  let list = items;
  if (state.cat !== 'all') list = list.filter((it) => it.cats.includes(state.cat));
  const q = state.query.trim().toLowerCase();
  if (q) {
    list = list.filter((it) => [it.full_name, it.description, it.language, it.topics.join(' '), it.ai?.summary]
      .join(' ').toLowerCase().includes(q));
  }
  // «الأحدث»: ما اكتُشف في آخر تحديث أولاً (بدقة الساعة)، ثم الأكثر نجوماً
  const hour = (iso) => Math.floor(Date.parse(iso) / 36e5);
  const sorters = {
    new: (a, b) => hour(b.first_seen) - hour(a.first_seen) || b.stars - a.stars,
    stars: (a, b) => b.stars - a.stars,
    hot: (a, b) => b.velocity - a.velocity,
  };
  return [...list].sort(sorters[state.sort]);
}

// ---------- المكونات ----------
function card(it) {
  const s = summaryOf(it);
  const color = LANG_COLORS[it.language] || '#8b98a7';
  return `<a class="card" href="#/repo/${esc(it.full_name)}">
    <div class="card-head">
      <img class="avatar" src="${esc(it.avatar)}&s=72" alt="" loading="lazy">
      <div class="card-title"><span class="name">${esc(it.name)}</span><span class="owner">${esc(it.owner)}</span></div>
      ${isNew(it) ? '<span class="badge-new">جديد</span>' : ''}
    </div>
    <p class="${isArabic(s) ? '' : 'en'}" dir="auto">${esc(s)}</p>
    <div class="meta">
      <span class="stars">★ ${nf.format(it.stars)}</span>
      ${it.language ? `<span><i class="dot" style="background:${color}"></i>${esc(it.language)}</span>` : ''}
      ${it.cats.slice(0, 2).map((c) => `<span class="tag">${catMeta(c).emoji} ${esc(catMeta(c).name)}</span>`).join('')}
      <span>${ago(it.created_at)}</span>
    </div>
  </a>`;
}

function chips(items, allowed) {
  const counts = {};
  for (const it of items) for (const c of it.cats) counts[c] = (counts[c] || 0) + 1;
  const cats = state.data.categories.filter((c) => counts[c.id] && (!allowed || allowed.includes(c.id)));
  return `<div class="chips" id="chips">
    <button class="chip ${state.cat === 'all' ? 'on' : ''}" data-cat="all">الكل <span class="n">${items.length}</span></button>
    ${cats.map((c) => `<button class="chip ${state.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.emoji} ${esc(c.name)} <span class="n">${counts[c.id]}</span></button>`).join('')}
  </div>`;
}

function feed(items, { allowed, emptyHtml } = {}) {
  if (allowed && state.cat !== 'all' && !allowed.includes(state.cat)) state.cat = 'all';
  const list = filtered(items);
  const newCount = items.filter(isNew).length;
  view.innerHTML = `
    ${chips(items, allowed)}
    ${newCount ? `<div class="banner"><span>✨ ${newCount} أداة جديدة منذ زيارتك الأخيرة</span></div>` : ''}
    <div class="toolbar">
      <span class="count">${list.length} أداة · حُدّث ${ago(state.data.generated_at)}</span>
      <select class="sort" id="sort" aria-label="الترتيب">
        <option value="new" ${state.sort === 'new' ? 'selected' : ''}>الأحدث</option>
        <option value="hot" ${state.sort === 'hot' ? 'selected' : ''}>الأسرع صعوداً</option>
        <option value="stars" ${state.sort === 'stars' ? 'selected' : ''}>الأكثر نجوماً</option>
      </select>
    </div>
    <div class="list">${list.length ? list.slice(0, state.shown).map(card).join('') : (emptyHtml || '<div class="empty"><span class="big">🔍</span>لا توجد نتائج</div>')}</div>
    ${list.length > state.shown ? `<button class="more" id="more">عرض المزيد (${list.length - state.shown})</button>` : ''}`;

  $('#chips').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.cat = b.dataset.cat;
    state.shown = 40;
    render();
  };
  $('#sort').onchange = (e) => { state.sort = e.target.value; store.set('sort', state.sort); render(); };
  const more = $('#more');
  if (more) {
    more.onclick = () => { state.shown += 40; render(true); };
    new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { ob.disconnect(); more.click(); } }, { rootMargin: '400px' }).observe(more);
  }
}

// ---------- صفحة الأداة ----------
function codeBlock(c) {
  return `<div class="code-block">
    <div class="code-head"><span class="t" dir="auto">${esc(c.title)} <span class="lang">· ${esc(c.lang)}</span></span><button class="copy">نسخ</button></div>
    <pre><code class="language-${esc(c.lang)}">${esc(c.code)}</code></pre>
  </div>`;
}

function fallbackSteps(it) {
  const r = it.readme || {};
  const steps = [];
  const lang = it.language;
  if (lang === 'Python') steps.push('أنشئ بيئة افتراضية: `python3 -m venv .venv && source .venv/bin/activate`');
  else if (['JavaScript', 'TypeScript', 'Vue', 'Svelte'].includes(lang)) steps.push('تأكد من تثبيت Node.js على جهازك: `node -v`');
  else if (lang === 'Rust') steps.push('ثبّت Rust إن لم يكن موجوداً: `curl https://sh.rustup.rs -sSf | sh`');
  else if (lang === 'Go') steps.push('تأكد من تثبيت Go: `go version`');
  else if (lang === 'Swift') steps.push('افتح المشروع في Xcode على جهاز Mac');
  if (r.requirements?.length) steps.push('راجع المتطلبات المذكورة أدناه وثبّتها أولاً');
  steps.push(r.install?.length ? 'نفّذ أوامر التثبيت في قسم «الكود» بالترتيب' : `استنسخ المستودع: \`git clone ${it.url}.git\``);
  if (r.usage?.length) steps.push('جرّب أمثلة الاستخدام المرفقة وعدّلها حسب حاجتك');
  if (it.homepage) steps.push('للتوثيق الكامل زر الموقع الرسمي للأداة');
  steps.push('اقرأ ملف README في GitHub لمعرفة كل الخيارات والإعدادات');
  return steps;
}

function detail(name) {
  const it = state.byName.get(name);
  if (!it) {
    view.innerHTML = `<div class="empty"><span class="big">🤷</span>لم تعد هذه الأداة ضمن القائمة.<br><br><a class="btn" href="https://github.com/${esc(name)}" target="_blank" rel="noopener">فتحها في GitHub</a></div>`;
    return;
  }
  const r = it.readme || { install: [], usage: [], features: [], requirements: [] };
  const ai = it.ai;
  const saved = state.saved.includes(it.full_name);
  const features = ai?.features?.length ? ai.features : r.features;
  const steps = ai?.how_to?.length ? ai.how_to : fallbackSteps(it);

  view.innerHTML = `<article class="detail">
    <button class="back" id="back"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>رجوع</button>
    <div class="hero">
      <img class="avatar" src="${esc(it.avatar)}&s=112" alt="">
      <div><h1>${esc(it.name)}</h1><div class="owner">${esc(it.owner)}</div></div>
    </div>
    <div class="actions">
      <a class="btn primary" href="${esc(it.url)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>فتح في GitHub</a>
      <button class="btn" id="save">${saved ? '✓ محفوظة' : '☆ حفظ'}</button>
      <button class="btn" id="share" aria-label="مشاركة"><svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6"/></svg></button>
    </div>
    <div class="stats">
      <div class="stat"><b>★ ${nf.format(it.stars)}</b><span>نجوم</span></div>
      <div class="stat"><b>${it.velocity}</b><span>نجمة/يوم</span></div>
      <div class="stat"><b>${nf.format(it.forks)}</b><span>نسخ (Forks)</span></div>
    </div>

    <section class="section">
      <h2>📝 نبذة ${ai?.summary ? '<span class="ai-tag">ملخص ذكي</span>' : ''}</h2>
      ${ai?.summary ? `<p>${esc(ai.summary)}</p>` : ''}
      ${it.description ? `<p class="${isArabic(it.description) ? '' : 'orig'}" dir="auto">${esc(it.description)}</p>` : ''}
      ${!ai?.summary && r.excerpt && r.excerpt !== it.description ? `<p class="orig" dir="auto">${esc(r.excerpt)}</p>` : ''}
    </section>

    ${features?.length ? `<section class="section"><h2>✨ المميزات</h2><ul>${features.map((f) => `<li class="${isArabic(f) ? '' : 'en'}" dir="auto">${inlineMd(f)}</li>`).join('')}</ul></section>` : ''}

    ${ai?.use_cases?.length ? `<section class="section"><h2>🎯 متى تستخدمها؟</h2><ul>${ai.use_cases.map((f) => `<li>${inlineMd(f)}</li>`).join('')}</ul></section>` : ''}

    <section class="section">
      <h2>📋 المواصفات</h2>
      <table class="specs">
        <tr><td>المجال</td><td dir="rtl" style="text-align:right">${it.cats.map((c) => `${catMeta(c).emoji} ${esc(catMeta(c).name)}`).join('، ')}</td></tr>
        ${it.language ? `<tr><td>لغة البرمجة</td><td>${esc(it.language)}</td></tr>` : ''}
        <tr><td>الرخصة</td><td>${esc(it.license || 'غير محددة')}</td></tr>
        <tr><td>تاريخ الإنشاء</td><td dir="rtl" style="text-align:right">${ago(it.created_at)}</td></tr>
        <tr><td>آخر تحديث للكود</td><td dir="rtl" style="text-align:right">${ago(it.pushed_at)}</td></tr>
        <tr><td>المشاكل المفتوحة</td><td>${it.issues}</td></tr>
        <tr><td>الحجم</td><td>${it.size_kb > 1024 ? (it.size_kb / 1024).toFixed(1) + ' MB' : it.size_kb + ' KB'}</td></tr>
        ${it.homepage ? `<tr><td>الموقع</td><td><a href="${esc(it.homepage)}" target="_blank" rel="noopener" style="color:var(--accent)">${esc(it.homepage.replace(/^https?:\/\//, ''))}</a></td></tr>` : ''}
        ${it.topics.length ? `<tr><td>الوسوم</td><td><div class="topics">${it.topics.slice(0, 12).map((t) => `<span>${esc(t)}</span>`).join('')}</div></td></tr>` : ''}
      </table>
      ${r.requirements?.length ? `<div class="sub">المتطلبات</div><ul>${r.requirements.map((x) => `<li class="en" dir="auto">${inlineMd(x)}</li>`).join('')}</ul>` : ''}
    </section>

    <section class="section">
      <h2>🚀 طريقة الاستفادة ${ai?.how_to?.length ? '<span class="ai-tag">ملخص ذكي</span>' : ''}</h2>
      <ol>${steps.map((s) => `<li dir="auto">${inlineMd(s)}</li>`).join('')}</ol>
    </section>

    <section class="section">
      <h2>💻 الكود</h2>
      <div class="sub">التثبيت</div>
      ${r.install.map(codeBlock).join('')}
      ${r.usage.length ? `<div class="sub">أمثلة الاستخدام</div>${r.usage.map(codeBlock).join('')}` : '<p class="note">لا توجد أمثلة كود في ملف README، افتح المستودع لتصفح الملفات.</p>'}
      <div class="sub">تحميل المشروع كاملاً</div>
      ${codeBlock({ title: 'Git', lang: 'bash', code: `git clone ${it.url}.git` })}
      <a class="btn" style="width:100%" href="${esc(it.url)}/archive/refs/heads/${esc(it.default_branch || 'main')}.zip">⬇︎ تحميل ZIP</a>
    </section>
  </article>`;

  $('#back').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/'));
  $('#save').onclick = (e) => {
    const i = state.saved.indexOf(it.full_name);
    if (i >= 0) state.saved.splice(i, 1); else state.saved.unshift(it.full_name);
    store.set('saved', state.saved);
    e.currentTarget.textContent = i >= 0 ? '☆ حفظ' : '✓ محفوظة';
    toast(i >= 0 ? 'أزيلت من المحفوظة' : 'حُفظت');
  };
  $('#share').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: it.full_name, text: summaryOf(it), url: it.url }); } catch {} }
    else { await navigator.clipboard?.writeText(it.url); toast('نُسخ الرابط'); }
  };
  highlight();
  window.scrollTo(0, 0);
}

// تلوين الأكواد (يُحمّل عند الحاجة فقط)
let hljsReady;
function highlight() {
  hljsReady ||= new Promise((resolve) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    document.head.append(css);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    s.onload = () => resolve(window.hljs);
    s.onerror = () => resolve(null);
    document.head.append(s);
  });
  hljsReady.then((hljs) => {
    if (!hljs) return;
    document.querySelectorAll('.code-block code').forEach((el) => {
      const lang = el.className.replace('language-', '');
      if (!hljs.getLanguage(lang)) el.className = 'language-plaintext';
      try { hljs.highlightElement(el); } catch {}
    });
  });
}

// ---------- الإعدادات ----------
function settings() {
  const cats = state.data.categories;
  const prefix = state.data.ntfy_prefix;
  const theme = store.get('theme', 'auto');
  const alertTopics = [...state.alertCats.map((c) => `${prefix}-${c}`)];

  view.innerHTML = `<div class="settings">
    <h2>⭐ مجالاتي</h2>
    <p class="hint">اختر المجالات التي تهمك لتظهر في تبويب «مجالاتي». فعّل 🔔 للمجالات التي تريد تنبيهاً فورياً عند ظهور أداة جديدة فيها.</p>
    <div class="row-actions">
      <button class="btn" id="all-on">تحديد الكل</button>
      <button class="btn" id="all-off">إلغاء الكل</button>
    </div>
    ${cats.map((c) => `<div class="cat-row">
      <span class="e">${c.emoji}</span><span class="nm">${esc(c.name)}</span>
      <label class="toggle"><input type="checkbox" data-my="${c.id}" ${state.myCats.includes(c.id) ? 'checked' : ''}><i></i>متابعة</label>
      <label class="toggle"><input type="checkbox" data-alert="${c.id}" ${state.alertCats.includes(c.id) ? 'checked' : ''}><i></i>🔔 فوري</label>
    </div>`).join('')}

    <h2>🔔 التنبيهات الفورية</h2>
    ${prefix ? `
      <p class="hint">التنبيهات تصل عبر تطبيق <b>ntfy</b> المجاني (بدون حساب). يتحقق 3zhub من الأدوات الجديدة كل ساعة ويرسل لكل مجال تنبيهاً مستقلاً.</p>
      <ol class="steps">
        <li>ثبّت تطبيق <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener" style="color:var(--accent)">ntfy من App Store</a>.</li>
        <li>في ntfy اضغط <b>+</b> واكتب اسم القناة (انسخه من الأسفل) ثم <b>Subscribe</b>.</li>
        <li>كرر لكل مجال فعّلت له 🔔.</li>
      </ol>
      <div class="sub-list">
        ${alertTopics.length ? state.alertCats.map((c) => `<div class="cat-row"><div><b>${catMeta(c).emoji} ${esc(catMeta(c).name)}</b><span class="topic-name">${esc(prefix)}-${c}</span></div><button class="btn" data-copy="${esc(prefix)}-${c}">نسخ</button></div>`).join('')
          : '<p class="note">لم تفعّل التنبيه لأي مجال بعد. فعّل 🔔 بجانب المجالات أعلاه.</p>'}
        <div class="cat-row"><div><b>✨ كل الأدوات الجديدة (ملخص)</b><span class="topic-name">${esc(prefix)}-all</span></div><button class="btn" data-copy="${esc(prefix)}-all">نسخ</button></div>
      </div>` : '<p class="note">التنبيهات غير مفعّلة على الخادم بعد (يحتاج ضبط NTFY_PREFIX في إعدادات المستودع).</p>'}

    <h2>🌍 اللغة</h2>
    <div class="cat-row">
      <span class="nm">إخفاء الأدوات الموصوفة بالصينية أو اليابانية أو الكورية</span>
      <label class="toggle"><input type="checkbox" id="hide-cjk" ${state.hideCJK ? 'checked' : ''}><i></i></label>
    </div>

    <h2>🎨 المظهر</h2>
    <div class="seg" id="theme">
      <button data-v="auto" class="${theme === 'auto' ? 'on' : ''}">تلقائي</button>
      <button data-v="light" class="${theme === 'light' ? 'on' : ''}">فاتح</button>
      <button data-v="dark" class="${theme === 'dark' ? 'on' : ''}">داكن</button>
    </div>

    <h2>ℹ️ عن التطبيق</h2>
    <p class="hint">3zhub يجمع أحدث المستودعات الصاعدة في GitHub، يصنفها في ${cats.length} مجالاً، ويستخرج أكواد التثبيت والاستخدام. آخر تحديث للبيانات: ${ago(state.data.generated_at)} · ${state.data.items.length} أداة.</p>
  </div>`;

  const save = () => { store.set('myCats', state.myCats); store.set('alertCats', state.alertCats); };
  view.onchange = (e) => {
    const t = e.target;
    if (t.id === 'hide-cjk') { state.hideCJK = t.checked; store.set('hideCJK', t.checked); return; }
    if (t.dataset.my) {
      state.myCats = t.checked ? [...new Set([...state.myCats, t.dataset.my])] : state.myCats.filter((c) => c !== t.dataset.my);
    } else if (t.dataset.alert) {
      state.alertCats = t.checked ? [...new Set([...state.alertCats, t.dataset.alert])] : state.alertCats.filter((c) => c !== t.dataset.alert);
      if (t.checked && !state.myCats.includes(t.dataset.alert)) state.myCats.push(t.dataset.alert);
      save();
      const y = window.scrollY;
      settings();
      window.scrollTo(0, y);
      return;
    }
    save();
  };
  $('#all-on').onclick = () => { state.myCats = cats.map((c) => c.id); save(); settings(); };
  $('#all-off').onclick = () => { state.myCats = []; state.alertCats = []; save(); settings(); };
  view.querySelectorAll('[data-copy]').forEach((b) => {
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast('نُسخ اسم القناة'); } catch { toast(b.dataset.copy); }
    };
  });
  $('#theme').onclick = (e) => {
    const v = e.target.dataset.v;
    if (!v) return;
    store.set('theme', v);
    applyTheme();
    settings();
  };
}

function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

// ---------- التوجيه ----------
function render(keepScroll = false) {
  if (!state.data) return;
  view.onchange = null;
  const hash = decodeURIComponent(location.hash.slice(1) || '/');
  const tab = hash.startsWith('/mine') ? 'mine' : hash.startsWith('/saved') ? 'saved' : hash.startsWith('/settings') ? 'settings' : 'home';
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab && !hash.startsWith('/repo/')));
  const y = window.scrollY;
  // إخفاء الأدوات التي وصفها بالصينية/اليابانية/الكورية ما لم يُترجمها الملخص الذكي
  const items = state.hideCJK
    ? state.data.items.filter((it) => it.ai?.summary || !isCJK(`${it.name} ${it.description}`))
    : state.data.items;

  if (hash.startsWith('/repo/')) return detail(hash.slice(6));
  if (tab === 'settings') settings();
  else if (tab === 'mine') {
    if (!state.myCats.length) {
      view.innerHTML = `<div class="empty"><span class="big">⭐</span>لم تختر مجالاتك بعد.<br>اختر المجالات التي تهمك لتظهر أدواتها هنا.<br><br><a class="btn primary" href="#/settings">اختيار المجالات</a></div>`;
    } else {
      feed(items.filter((it) => it.cats.some((c) => state.myCats.includes(c))), { allowed: state.myCats });
    }
  } else if (tab === 'saved') {
    const list = state.saved.map((n) => state.byName.get(n)).filter(Boolean);
    feed(list, { emptyHtml: '<div class="empty"><span class="big">🔖</span>لا توجد أدوات محفوظة.<br>اضغط «حفظ» في صفحة أي أداة.</div>' });
  } else feed(items);
  if (keepScroll) window.scrollTo(0, y);
}

// نحفظ موضع التمرير لكل صفحة حتى يرجع المستخدم لنفس المكان بعد فتح أداة
let lastListHash = '';
let currentHash = location.hash;
const scrollMem = {};
window.addEventListener('hashchange', () => {
  scrollMem[currentHash] = window.scrollY;
  const h = (currentHash = location.hash);
  if (!h.startsWith('#/repo/')) {
    if (h !== lastListHash) { state.cat = 'all'; state.shown = 40; }
    lastListHash = h;
  }
  render();
  if (!h.startsWith('#/repo/')) window.scrollTo(0, scrollMem[h] || 0);
});

// ---------- الأحداث العامة ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.copy');
  if (!b) return;
  const code = b.closest('.code-block').querySelector('code').innerText;
  try { await navigator.clipboard.writeText(code); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: code });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  b.textContent = '✓ نُسخ';
  b.classList.add('ok');
  setTimeout(() => { b.textContent = 'نسخ'; b.classList.remove('ok'); }, 1500);
});

$('#btn-search').onclick = () => {
  const bar = $('#search-bar');
  bar.hidden = !bar.hidden;
  if (!bar.hidden) $('#search').focus();
  else if (state.query) { state.query = ''; $('#search').value = ''; render(); }
};
let searchTimer;
$('#search').oninput = (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = e.target.value;
    state.shown = 40;
    if (location.hash.startsWith('#/repo/') || location.hash.startsWith('#/settings')) location.hash = '#/';
    else render();
  }, 200);
};
$('#btn-refresh').onclick = async () => { await loadData(true); render(true); };

// تحديث تلقائي عند العودة للتطبيق بعد 15 دقيقة
let lastLoad = Date.now();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && Date.now() - lastLoad > 15 * 60e3) {
    lastLoad = Date.now();
    await loadData(true);
    if (!location.hash.startsWith('#/repo/')) render(true);
  }
});

// ---------- البداية ----------
applyTheme();
view.innerHTML = `<div class="list" style="padding-top:12px">${'<div class="skeleton"></div>'.repeat(6)}</div>`;
lastListHash = location.hash;
await loadData();
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
