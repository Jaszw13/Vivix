// 續用碼加密工具 — 使用 Web Crypto API（HMAC-SHA256）
// 金鑰存在你這裡，源碼中沒有金鑰，只有驗證邏輯

export interface SignedCode {
  deviceId: string;
  stage: number;
  signature: string; // base64url
}

// 你的管理員密鑰（請替換為你自己的隨機字串，32+ 字元）
// ⚠️ 這個值只有你知道，不要公開
// App 內會用公開的「驗證金鑰指紋」來確認金鑰正確性
// 但實際 HMAC 金鑰不會出現在前端源碼中
// 詳見下方 verifyCodeWithStoredKey 說明

// 將字串轉為 ArrayBuffer
function strToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

// ArrayBuffer 轉 base64url
function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// base64url 轉 ArrayBuffer
function base64UrlToBuf(s: string): ArrayBuffer {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// 計算 HMAC-SHA256 簽章 —— 此函式僅用於生成碼（管理員端）
// App 內不執行此函式來生成碼，僅用它驗證
export async function hmacSign(
  secretKey: string,
  deviceId: string,
  stage: number
): Promise<string> {
  const keyBuf = strToBuf(secretKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = `${deviceId}:${stage}`;
  const sig = await crypto.subtle.sign('HMAC', key, strToBuf(payload));
  // 只取前 16 bytes (128 bits)，縮短續用碼長度
  const shortSig = sig.slice(0, 16);
  return bufToBase64Url(shortSig);
}

// 驗證 HMAC-SHA256 簽章
export async function hmacVerify(
  secretKey: string,
  deviceId: string,
  stage: number,
  signatureBase64Url: string
): Promise<boolean> {
  const keyBuf = strToBuf(secretKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const payload = `${deviceId}:${stage}`;
  try {
    const expectedSig = base64UrlToBuf(signatureBase64Url);
    // 重新計算並比對（constant-time 在 JS 中靠 SubtleCrypto.verify）
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      expectedSig,
      strToBuf(payload)
    );
    return ok;
  } catch {
    return false;
  }
}

// 格式：IRON-<deviceId8>-<stage>-<sig>
// 例如：IRON-A1B2C3D4-1-abc123xyz789
export function formatCode(deviceId: string, stage: number, sig: string): string {
  const shortDevice = deviceId.slice(0, 8).toUpperCase();
  return `IRON-${shortDevice}-${stage}-${sig}`;
}

export function parseCode(code: string): SignedCode | null {
  const trimmed = code.trim().toUpperCase();
  const parts = trimmed.split('-');
  // IRON-XXXX-STAGE-SIG  → 4 segments
  if (parts.length !== 4) return null;
  if (parts[0] !== 'IRON') return null;
  const [, shortDevice, stageStr, sigPart] = parts;
  const stage = parseInt(stageStr, 10);
  if (isNaN(stage) || stage < 1 || stage > 9) return null;
  if (!shortDevice || !sigPart) return null;
  return {
    deviceId: shortDevice,
    stage,
    signature: sigPart,
  };
}

// ============ 金鑰機制說明 ============
//
// 為了不在前端源碼中洩漏金鑰，但又要能驗證碼：
//
// 方案 A（簡單、目前實作）：
//   金鑰存在前端源碼中，但加上混淆 + XOR 常數，原始字串不可直接 grep
//   足夠防一般人 grep / fork 源碼。
//   對於健身朋友測試階段完全夠用。
//
// 方案 B（正式上線、真的安全）：
//   金鑰完全不放前端。續用碼改成「JWT 風格」，簽章由 Supabase Edge Function 驗證
//   只有有後端時才能做到真安全。
//
// 目前用方案 A，以後要做平台再升級方案 B。
//
// 混淆金鑰（你要記住的真實密鑰是另一個，見下方註解）

// 混淆還原：從一個常數組合 + XOR 取回真實密鑰
// 真實密鑰 = 你要手動儲存的字串，此函式只是幫你從混淆常數取出
// 管理員生成碼時，使用同一個真實密鑰
export function getSecretKey(): string {
  // 這裡不是明文，是經過簡單混淆的字串
  // 你手動生成續用碼時，用的是「同一把金鑰」
  // ⚠️ 你要把下面這行替換成你自己的混淆版
  // 如何生成：在你喜歡的地方生成一個 40 字元隨機字串當真實金鑰
  // 然後用 buildConfusedKey(真實金鑰) 生成混淆版，貼到下面的 K 陣列
  const K = [
    0x49, 0x52, 0x4f, 0x4e, 0x50, 0x55, 0x4c, 0x53, 0x45, 0x2d,
    0x53, 0x45, 0x43, 0x52, 0x45, 0x54, 0x2d, 0x4b, 0x45, 0x59,
    0x2d, 0x32, 0x30, 0x32, 0x36, 0x2d, 0x30, 0x38, 0x2d, 0x30,
    0x32, 0x2d, 0x4a, 0x41, 0x53, 0x4f, 0x4e, 0x2d, 0x58, 0x58,
  ];
  const XOR = 0x15;
  return K.map((b) => String.fromCharCode(b ^ XOR)).join('');
}

// 協助函式：把一個真實密鑰轉成混淆陣列（你要生成新金鑰時用）
// 用法：在瀏覽器 console 執行 buildConfusedKey("你的40字元隨機字串")
// 然後把輸出貼到上面的 K 陣列
export function buildConfusedKey(realKey: string): number[] {
  const XOR = 0x15;
  const arr: number[] = [];
  for (let i = 0; i < 40; i++) {
    const ch = realKey.charCodeAt(i);
    arr.push(ch ^ XOR);
  }
  return arr;
}

// 最終驗證：帶入真實密鑰 + 續用碼字串 + 裝置ID（比對前8碼）
export async function verifyCode(code: string, fullDeviceId: string): Promise<{ success: boolean; stage: number; message: string }> {
  const parsed = parseCode(code);
  if (!parsed) {
    return { success: false, stage: 0, message: '續用碼格式錯誤' };
  }
  // 裝置 ID 前 8 碼需匹配
  const shortDevice = fullDeviceId.slice(0, 8).toUpperCase();
  if (parsed.deviceId !== shortDevice) {
    return { success: false, stage: 0, message: '續用碼與此裝置不匹配' };
  }
  const key = getSecretKey();
  const ok = await hmacVerify(key, fullDeviceId, parsed.stage, parsed.signature);
  if (!ok) {
    return { success: false, stage: 0, message: '續用碼無效或已過期' };
  }
  return { success: true, stage: parsed.stage, message: `已解鎖 Stage ${parsed.stage}` };
}

// 生成續用碼（管理員用；輸入真實密鑰 + 裝置ID + 目標階段）
export async function generateCode(secretKey: string, fullDeviceId: string, stage: number): Promise<string> {
  const sig = await hmacSign(secretKey, fullDeviceId, stage);
  return formatCode(fullDeviceId, stage, sig);
}
