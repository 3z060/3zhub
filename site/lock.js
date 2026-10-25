// قفل التطبيق: فك تشفير البيانات بكلمة المرور، وFace ID عبر WebAuthn، وحفظ المفتاح على الجهاز
// المفتاح لا يُحفظ إلا بعد تفعيل Face ID، ويكون غير قابل للتصدير (non-extractable) داخل IndexedDB.

const enc = new TextEncoder();
const b64 = {
  dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  url: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  unurl: (s) => b64.dec(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)),
};

// ---------- التشفير ----------
export async function deriveKey(password, box) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64.dec(box.salt), iterations: box.iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
}

export async function decryptBox(box, key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(box.iv) }, key, b64.dec(box.ct));
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

// ---------- التخزين الآمن للمفتاح ----------
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('3zhub-secure', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kv(mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}
export const vault = {
  get: (k) => kv('readonly', (s) => s.get(k)).catch(() => undefined),
  set: (k, v) => kv('readwrite', (s) => s.put(v, k)),
  del: (k) => kv('readwrite', (s) => s.delete(k)).catch(() => {}),
};

// ---------- Face ID (WebAuthn) ----------
export const faceIdSupported = async () =>
  !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false));

export async function registerFaceId() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: '3zhub', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: '3zhub', displayName: '3zhub' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
    },
  });
  const spki = cred.response.getPublicKey?.();
  if (!spki) throw new Error('الجهاز لا يدعم Face ID لهذا التطبيق');
  return { id: b64.url(cred.rawId), spki: new Uint8Array(spki) };
}

// تحويل توقيع DER إلى الصيغة الخام r||s التي يقبلها WebCrypto
function derToRaw(der) {
  let i = 2;
  const read = () => {
    i++; // 0x02
    const len = der[i++];
    let v = der.slice(i, i + len);
    i += len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  const r = read();
  const s = read();
  const raw = new Uint8Array(64);
  raw.set(r);
  raw.set(s, 32);
  return raw;
}

/** يطلب Face ID ويتحقق من التوقيع محلياً بالمفتاح العام المسجّل */
export async function verifyFaceId(reg) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const res = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: b64.unurl(reg.id) }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  const r = res.response;
  const client = JSON.parse(new TextDecoder().decode(r.clientDataJSON));
  if (client.type !== 'webauthn.get' || client.challenge !== b64.url(challenge) || client.origin !== location.origin) return false;
  const auth = new Uint8Array(r.authenticatorData);
  if (!(auth[32] & 0x04)) return false; // لم يتم التحقق من هوية المستخدم
  const pub = await crypto.subtle.importKey('spki', reg.spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const hash = await crypto.subtle.digest('SHA-256', r.clientDataJSON);
  const signed = new Uint8Array(auth.length + 32);
  signed.set(auth);
  signed.set(new Uint8Array(hash), auth.length);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, derToRaw(new Uint8Array(r.signature)), signed);
}
