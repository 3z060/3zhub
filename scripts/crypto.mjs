// تشفير البيانات قبل نشرها: AES-256-GCM بمفتاح مشتق من كلمة المرور (PBKDF2-SHA256)
// الموقع العام لا يحوي إلا نصاً مشفراً، ولا يُقرأ إلا بكلمة مرور التطبيق.

import { webcrypto as crypto } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

export const ITERATIONS = 600_000;
const b64 = (buf) => Buffer.from(buf).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

// الملح ثابت لكل تطبيق (ليس سراً) حتى يبقى المفتاح المحفوظ على الجوال صالحاً بعد كل تحديث،
// أما IV فعشوائي في كل تشفير كما يتطلب AES-GCM
async function appSalt() {
  const id = `3zhub/${process.env.GITHUB_REPOSITORY || 'local'}`;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id))).slice(0, 16);
}

export async function encryptJSON(obj, password) {
  const salt = await appSalt();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const plain = gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 });
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { v: 1, alg: 'PBKDF2-SHA256/AES-256-GCM/gzip', iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

export async function decryptJSON(box, password) {
  const key = await deriveKey(password, unb64(box.salt), box.iter);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
  return JSON.parse(gunzipSync(Buffer.from(plain)).toString('utf8'));
}
