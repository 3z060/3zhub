// تعريف المجالات: كل مجال له كلمات مفتاحية تُطابق مع الـ topics والاسم والوصف
// `seed` هو الـ topic الذي نبحث به في GitHub لضمان وجود أدوات جديدة في كل مجال

export const CATEGORIES = [
  {
    id: 'ai', name: 'ذكاء اصطناعي', emoji: '🤖', seed: 'llm',
    keys: ['ai', 'llm', 'llms', 'gpt', 'chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'llama', 'ollama',
      'rag', 'prompt', 'prompt-engineering', 'langchain', 'transformer', 'transformers', 'diffusion',
      'stable-diffusion', 'generative-ai', 'genai', 'artificial-intelligence', 'chatbot', 'deepseek', 'qwen',
      'embedding', 'embeddings', 'fine-tuning', 'inference', 'vllm', 'multimodal'],
  },
  {
    id: 'agents', name: 'وكلاء ذكيون و MCP', emoji: '🧠', seed: 'ai-agents',
    keys: ['agent', 'agents', 'ai-agent', 'ai-agents', 'agentic', 'mcp', 'mcp-server', 'model-context-protocol',
      'autonomous-agents', 'multi-agent', 'copilot', 'coding-agent', 'claude-code', 'cursor', 'codex', 'a2a'],
  },
  {
    id: 'ml', name: 'تعلم آلي وبيانات', emoji: '📊', seed: 'machine-learning',
    keys: ['machine-learning', 'deep-learning', 'pytorch', 'tensorflow', 'jax', 'neural-network', 'computer-vision',
      'nlp', 'dataset', 'datasets', 'data-science', 'jupyter', 'pandas', 'analytics', 'data-visualization',
      'reinforcement-learning', 'yolo', 'kaggle', 'etl', 'data-engineering'],
  },
  {
    id: 'security', name: 'أمن سيبراني', emoji: '🔐', seed: 'security',
    keys: ['security', 'pentest', 'pentesting', 'penetration-testing', 'hacking', 'cybersecurity', 'vulnerability',
      'exploit', 'ctf', 'osint', 'malware', 'red-team', 'redteam', 'blue-team', 'bug-bounty', 'encryption',
      'privacy', 'forensics', 'reverse-engineering', 'infosec', 'cve', 'fuzzing', 'phishing', 'password'],
  },
  {
    id: 'frontend', name: 'واجهات الويب', emoji: '🌐', seed: 'react',
    keys: ['react', 'reactjs', 'vue', 'vuejs', 'svelte', 'nextjs', 'next', 'nuxt', 'frontend', 'css', 'tailwind',
      'tailwindcss', 'shadcn', 'ui-components', 'angular', 'html', 'web-components', 'javascript', 'astro',
      'vite', 'solidjs', 'web'],
  },
  {
    id: 'backend', name: 'خوادم و APIs', emoji: '🖥️', seed: 'backend',
    keys: ['backend', 'api', 'rest-api', 'graphql', 'server', 'microservices', 'fastapi', 'express', 'django',
      'flask', 'nestjs', 'spring-boot', 'laravel', 'rails', 'grpc', 'websocket', 'http', 'nodejs', 'deno', 'bun'],
  },
  {
    id: 'mobile', name: 'تطبيقات الجوال', emoji: '📱', seed: 'ios',
    keys: ['android', 'ios', 'flutter', 'react-native', 'swift', 'swiftui', 'kotlin', 'mobile', 'jetpack-compose',
      'expo', 'iphone', 'xcode', 'mobile-app'],
  },
  {
    id: 'devops', name: 'DevOps وسحابة', emoji: '☁️', seed: 'devops',
    keys: ['devops', 'kubernetes', 'k8s', 'docker', 'terraform', 'ci-cd', 'cicd', 'cloud', 'aws', 'gcp', 'azure',
      'infrastructure', 'monitoring', 'observability', 'serverless', 'self-hosted', 'selfhosted', 'homelab',
      'helm', 'ansible', 'nginx', 'proxy', 'github-actions', 'cloudflare'],
  },
  {
    id: 'database', name: 'قواعد بيانات', emoji: '🗄️', seed: 'database',
    keys: ['database', 'sql', 'postgres', 'postgresql', 'sqlite', 'mysql', 'redis', 'mongodb', 'vector-database',
      'orm', 'nosql', 'duckdb', 'clickhouse', 'supabase', 'key-value'],
  },
  {
    id: 'cli', name: 'أدوات سطر الأوامر', emoji: '⌨️', seed: 'cli',
    keys: ['cli', 'terminal', 'command-line', 'shell', 'tui', 'bash', 'zsh', 'fish', 'dotfiles', 'command-line-tool'],
  },
  {
    id: 'devtools', name: 'أدوات المطورين', emoji: '🛠️', seed: 'developer-tools',
    keys: ['developer-tools', 'devtools', 'ide', 'vscode', 'vscode-extension', 'neovim', 'vim', 'editor', 'linter',
      'lint', 'testing', 'debugger', 'compiler', 'build-tool', 'git', 'productivity', 'code-review', 'sdk',
      'library', 'framework', 'typescript', 'rust', 'golang', 'python'],
  },
  {
    id: 'automation', name: 'أتمتة وبوتات', emoji: '⚡', seed: 'automation',
    keys: ['automation', 'scraper', 'scraping', 'web-scraping', 'crawler', 'bot', 'workflow', 'n8n',
      'browser-automation', 'playwright', 'puppeteer', 'selenium', 'telegram-bot', 'discord-bot', 'rpa',
      'whatsapp', 'zapier'],
  },
  {
    id: 'design', name: 'تصميم وجرافيك', emoji: '🎨', seed: 'design',
    keys: ['design', 'ui', 'ux', 'figma', 'icons', 'fonts', 'animation', '3d', 'threejs', 'svg', 'design-system',
      'webgl', 'shader', 'graphics', 'canvas'],
  },
  {
    id: 'gamedev', name: 'تطوير الألعاب', emoji: '🎮', seed: 'game',
    keys: ['game', 'games', 'gamedev', 'game-development', 'game-engine', 'unity', 'godot', 'unreal-engine',
      'minecraft', 'emulator', 'roblox', 'pixel-art'],
  },
  {
    id: 'blockchain', name: 'بلوكتشين وكريبتو', emoji: '⛓️', seed: 'blockchain',
    keys: ['blockchain', 'crypto', 'cryptocurrency', 'ethereum', 'web3', 'solidity', 'bitcoin', 'defi',
      'smart-contracts', 'solana', 'nft', 'wallet'],
  },
  {
    id: 'hardware', name: 'عتاد وإنترنت الأشياء', emoji: '🔌', seed: 'iot',
    keys: ['iot', 'embedded', 'arduino', 'raspberry-pi', 'esp32', 'hardware', 'robotics', 'firmware',
      'home-assistant', 'homeassistant', 'smart-home', 'drone', 'microcontroller', 'ros'],
  },
  {
    id: 'desktop', name: 'تطبيقات سطح المكتب', emoji: '💻', seed: 'desktop-app',
    keys: ['desktop', 'desktop-app', 'electron', 'tauri', 'macos', 'windows', 'linux', 'gtk', 'qt', 'menubar',
      'mac', 'wayland'],
  },
  {
    id: 'media', name: 'صوت وفيديو وصور', emoji: '🎬', seed: 'video',
    keys: ['video', 'audio', 'music', 'image', 'image-processing', 'ffmpeg', 'youtube', 'streaming', 'tts',
      'text-to-speech', 'speech', 'speech-recognition', 'whisper', 'ocr', 'podcast', 'video-editing', 'voice'],
  },
  {
    id: 'learning', name: 'تعليم وقوائم مفيدة', emoji: '📚', seed: 'awesome',
    keys: ['awesome', 'awesome-list', 'tutorial', 'tutorials', 'learning', 'course', 'interview', 'roadmap',
      'books', 'cheatsheet', 'education', 'guide', 'resources', 'free'],
  },
  { id: 'other', name: 'أخرى', emoji: '📦', seed: null, keys: [] },
];

// تلميحات من لغة البرمجة
const LANG_HINTS = {
  Swift: 'mobile', Kotlin: 'mobile', Dart: 'mobile', 'Objective-C': 'mobile',
  HCL: 'devops', Dockerfile: 'devops', Solidity: 'blockchain', 'Jupyter Notebook': 'ml',
  Shell: 'cli', 'C++': 'devtools', Vue: 'frontend', Svelte: 'frontend', CSS: 'frontend',
  GDScript: 'gamedev', 'C#': 'gamedev', Verilog: 'hardware',
};

// كلمات شائعة جداً في الأوصاف؛ نعتبرها فقط إذا كانت ضمن الـ topics
const TOPIC_ONLY = new Set(['windows', 'linux', 'macos', 'mac', 'web', 'free', 'next', 'ui', 'api', 'library',
  'framework', 'python', 'typescript', 'rust', 'golang', 'git', 'bot', 'image', 'server', 'cloud', 'guide',
  'resources', 'design', 'desktop', 'javascript', 'html', 'privacy', 'wallet', 'voice', 'http', 'learning']);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = CATEGORIES.map((c) => {
  const textKeys = c.keys.filter((k) => !TOPIC_ONLY.has(k));
  return {
    id: c.id,
    topics: new Set(c.keys),
    // نطابق الكلمة كاملة فقط في الاسم والوصف، مع اعتبار "-" و "_" فواصل
    re: textKeys.length
      ? new RegExp(`(?:^|[^a-z0-9])(${textKeys.map((k) => esc(k).replace(/-/g, '[-_ ]?')).join('|')})(?=$|[^a-z0-9])`, 'gi')
      : null,
  };
});

/** يرجع قائمة المجالات مرتبة حسب قوة التطابق */
export function classify(repo) {
  const scores = {};
  const add = (id, n) => { scores[id] = (scores[id] || 0) + n; };
  const topics = repo.topics || [];
  const text = `${repo.name.replace(/[-_]/g, ' ')} ${repo.description || ''}`.toLowerCase();

  for (const p of PATTERNS) {
    for (const t of topics) if (p.topics.has(t)) add(p.id, 3);
    if (!p.re) continue;
    const hits = new Set([...text.matchAll(p.re)].map((m) => m[1].toLowerCase()));
    if (hits.size) add(p.id, Math.min(hits.size, 3) * 1.5);
  }
  const hint = LANG_HINTS[repo.language];
  if (hint) add(hint, 1);

  // كلمات عامة جداً (مثل python, library) لا تكفي وحدها
  const ranked = Object.entries(scores).filter(([, s]) => s >= 1.5).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return ranked.length ? ranked.slice(0, 3) : ['other'];
}
