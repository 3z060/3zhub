// استخراج المعلومات المفيدة من ملف README: النبذة، المميزات، المتطلبات، أكواد التثبيت والاستخدام

const INSTALL_HEAD = /(install|setup|set up|getting started|quick ?start|download|build|deploy|تثبيت|التثبيت)/i;
const USAGE_HEAD = /(usage|example|examples|quick ?start|how to|getting started|demo|basic|tutorial|run|api|استخدام)/i;
const FEATURES_HEAD = /(features|highlights|key features|what it does|why|capabilities|overview|المميزات|الميزات)/i;
const REQ_HEAD = /(requirements|prerequisites|dependencies|المتطلبات)/i;
const SHELL_LANGS = new Set(['', 'sh', 'bash', 'shell', 'zsh', 'console', 'shell-session', 'powershell', 'ps1', 'cmd', 'fish', 'text']);
const INSTALL_CMD = /^\s*[$>]?\s*(npm|pnpm|yarn|npx|bunx?|pip3?|pipx|uv|uvx|poetry|conda|brew|cargo|go (install|get)|docker|docker-compose|git clone|curl|wget|gem|composer|apt(-get)?|dnf|pacman|yay|winget|scoop|choco|dotnet|deno|flutter pub|swift package|make|cmake|helm|kubectl apply|nix)/m;

const MAX_LINES = 40;
const MAX_CHARS = 2500;

function cleanInline(s) {
  return s
    .replace(/`([^`]*)`/g, (_, c) => c.replace(/</g, '‹').replace(/>/g, '›')) // كود داخل السطر
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')            // صور
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')          // روابط
    .replace(/<[^>]+>/g, '')                          // HTML
    .replace(/[*_`~]{1,3}([^*_`~]+)[*_`~]{1,3}/g, '$1')
    .replace(/:[a-z0-9_+-]+:/g, '')                   // :emoji:
    .replace(/\s+/g, ' ')
    .trim();
}

function trimCode(code) {
  let lines = code.replace(/\s+$/, '').split('\n');
  let cut = false;
  if (lines.length > MAX_LINES) { lines = lines.slice(0, MAX_LINES); cut = true; }
  let out = lines.join('\n');
  if (out.length > MAX_CHARS) { out = out.slice(0, MAX_CHARS); cut = true; }
  return cut ? out + '\n# ...' : out;
}

/** تقسيم README إلى أقسام حسب العناوين، مع الأكواد والقوائم داخل كل قسم */
function sections(md) {
  const out = [];
  let cur = { head: '', text: [], code: [], bullets: [] };
  out.push(cur);
  const lines = md.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*(```+|~~~+)\s*([\w+#.-]*)/);
    if (fence) {
      const marker = fence[1];
      const lang = (fence[2] || '').toLowerCase();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(marker)) body.push(lines[i++]);
      // إزالة المسافة البادئة المشتركة
      const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length), 99);
      const code = body.map((l) => l.slice(indent === 99 ? 0 : indent)).join('\n').trim();
      if (code) cur.code.push({ lang, code });
      continue;
    }
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/) || line.match(/^\s*<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (h) {
      cur = { head: cleanInline(h[2] ?? h[1]), text: [], code: [], bullets: [] };
      out.push(cur);
      continue;
    }
    const b = line.match(/^\s{0,4}(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (b) { const t = cleanInline(b[1]); if (t.length > 3) cur.bullets.push(t); continue; }
    cur.text.push(line);
  }
  return out;
}

function firstParagraph(secs) {
  for (const s of secs) {
    for (const para of s.text.join('\n').split(/\n\s*\n/)) {
      const t = cleanInline(para);
      // تجاهل الشارات والأسطر القصيرة
      if (t.length >= 40 && !/^[|\-\s]+$/.test(t) && !/^(\[!|<)/.test(para.trim())) return t.slice(0, 500);
    }
  }
  return '';
}

export function parseReadme(md, repo) {
  const secs = sections((md || '').slice(0, 120_000));

  const features = [];
  for (const s of secs) {
    if (features.length >= 8) break;
    if (FEATURES_HEAD.test(s.head)) features.push(...s.bullets.slice(0, 8 - features.length));
  }
  const requirements = secs.filter((s) => REQ_HEAD.test(s.head)).flatMap((s) => s.bullets).slice(0, 6);

  const install = [];
  const usage = [];
  const seen = new Set();
  for (const s of secs) {
    for (const c of s.code) {
      const key = c.code.slice(0, 200);
      if (seen.has(key) || c.code.length < 4) continue;
      const isShell = SHELL_LANGS.has(c.lang);
      const looksInstall = INSTALL_CMD.test(c.code) && isShell && c.code.split('\n').length <= 15;
      if ((looksInstall || (INSTALL_HEAD.test(s.head) && isShell)) && install.length < 3) {
        install.push({ title: s.head || 'التثبيت', lang: c.lang || 'bash', code: trimCode(c.code) });
        seen.add(key);
      } else if ((USAGE_HEAD.test(s.head) || !isShell) && usage.length < 4 && !/^(mermaid|diff|svg|xml)$/.test(c.lang)) {
        usage.push({ title: s.head || 'مثال', lang: c.lang || 'text', code: trimCode(c.code) });
        seen.add(key);
      }
    }
  }
  // لو لم يوجد أي كود، نعطي على الأقل أمر الاستنساخ
  if (!install.length) {
    install.push({ title: 'استنساخ المستودع', lang: 'bash', code: `git clone https://github.com/${repo.full_name}.git\ncd ${repo.name}` });
  }

  return { excerpt: firstParagraph(secs), features, requirements, install, usage };
}
