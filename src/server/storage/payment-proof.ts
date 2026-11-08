import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Payment proof storage boundary.
 * Default: local private dir (dev-only, not durable on Vercel).
 * S3-compatible durable private storage is the intended production backend, but
 * requires credentials/infrastructure (PAYMENT_PROOF_S3_*). To avoid adding deps
 * or fabricating credentials, this module keeps a pluggable async boundary and
 * fails closed for missing production config rather than exposing public paths.
 * NEVER use public bucket/URL for proofs.
 */
const ROOT = process.env.PAYMENT_PROOF_DIR || path.join(process.cwd(), ".data", "payment-proofs");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export type StoredProof = { key: string; contentType: string; size: number; sha256: string; storage: "local" };

function sniffContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47) return "image/png";
  if (bytes.length >= 12 && bytes[0]===0x52 && bytes[1]===0x49 && bytes[2]===0x46 && bytes[3]===0x46 && bytes[8]===0x57 && bytes[9]===0x45 && bytes[10]===0x42 && bytes[11]===0x50) return "image/webp";
  if (bytes.length >= 5 && bytes[0]===0x25 && bytes[1]===0x50 && bytes[2]===0x44 && bytes[3]===0x46 && bytes[4]===0x2d) return "application/pdf";
  return null;
}

function assertS3ConfiguredForProd() {
  const wantsS3 = process.env.PAYMENT_PROOF_STORAGE === "s3";
  const prod = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (prod && !wantsS3) {
    throw Object.assign(new Error("Penyimpanan bukti pembayaran produksi belum dikonfigurasi."), { status: 503 });
  }
  if (wantsS3) {
    const missing = ["PAYMENT_PROOF_S3_ENDPOINT","PAYMENT_PROOF_S3_REGION","PAYMENT_PROOF_S3_BUCKET","PAYMENT_PROOF_S3_ACCESS_KEY_ID","PAYMENT_PROOF_S3_SECRET_ACCESS_KEY"].filter(k=>!process.env[k]);
    if (missing.length) throw Object.assign(new Error("Konfigurasi object storage belum lengkap."), { status: 503, missing });
    // S3 adapter intentionally not auto-wired without explicit SDK/signer implementation.
    throw Object.assign(new Error("Adapter S3 private proof storage belum terpasang di lingkungan ini."), { status: 503 });
  }
}

export async function storePaymentProof(input: {
  paymentId: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<StoredProof> {
  assertS3ConfiguredForProd();
  if (!input.bytes?.byteLength) throw Object.assign(new Error("File bukti kosong."), { status: 400 });
  if (input.bytes.byteLength > MAX_BYTES) throw Object.assign(new Error("Ukuran file bukti melebihi batas."), { status: 400 });
  const sniffed = sniffContentType(input.bytes);
  if (!sniffed || !ALLOWED.has(sniffed)) throw Object.assign(new Error("Tipe/isi file bukti tidak didukung."), { status: 400 });
  const ext = ALLOWED.get(sniffed)!;
  const sha256 = crypto.createHash("sha256").update(input.bytes).digest("hex");
  const key = `${input.paymentId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const full = path.join(ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, input.bytes);
  return { key, contentType: sniffed, size: input.bytes.byteLength, sha256, storage: "local" };
}

export async function readPaymentProof(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
  assertS3ConfiguredForProd();
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.resolve(ROOT, normalized);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) return null;
  try {
    const bytes = await fs.readFile(full);
    const ext = path.extname(full).slice(1).toLowerCase();
    const ct = [...ALLOWED.entries()].find(([, e]) => e === ext)?.[0];
    return { bytes, contentType: ct };
  } catch { return null; }
}
