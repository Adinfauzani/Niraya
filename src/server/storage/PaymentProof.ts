import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Payment proof storage boundary.
 * - dev/local: private dir (PAYMENT_PROOF_DIR, default .data/payment-proofs)
 * - production/Vercel: S3-compatible private object storage (PAYMENT_PROOF_STORAGE=s3)
 *   with SigV4-signed requests (no public URLs/buckets). Falls back to local only
 *   outside production/Vercel. Never expose public proof paths.
 */
const ROOT = process.env.PAYMENT_PROOF_DIR || path.join(process.cwd(), ".data", "payment-proofs");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export type StoredProof = {
  key: string;
  contentType: string;
  size: number;
  sha256: string;
  storage: "local" | "s3";
};

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function isProdRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function wantsS3() {
  return process.env.PAYMENT_PROOF_STORAGE === "s3";
}

function getS3Config(): S3Config | null {
  if (!wantsS3()) return null;
  const endpoint = (process.env.PAYMENT_PROOF_S3_ENDPOINT || "").trim().replace(/\/+$/, "");
  const region = (process.env.PAYMENT_PROOF_S3_REGION || "").trim();
  const bucket = (process.env.PAYMENT_PROOF_S3_BUCKET || "").trim();
  const accessKeyId = (process.env.PAYMENT_PROOF_S3_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.PAYMENT_PROOF_S3_SECRET_ACCESS_KEY || "").trim();
  const missing = [
    !endpoint && "PAYMENT_PROOF_S3_ENDPOINT",
    !region && "PAYMENT_PROOF_S3_REGION",
    !bucket && "PAYMENT_PROOF_S3_BUCKET",
    !accessKeyId && "PAYMENT_PROOF_S3_ACCESS_KEY_ID",
    !secretAccessKey && "PAYMENT_PROOF_S3_SECRET_ACCESS_KEY",
  ].filter(Boolean) as string[];
  if (missing.length) {
    throw Object.assign(new Error("Konfigurasi object storage belum lengkap."), { status: 503, missing });
  }
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function assertStorageAvailable() {
  if (wantsS3()) {
    getS3Config();
    return;
  }
  if (isProdRuntime()) {
    throw Object.assign(new Error("Penyimpanan bukti pembayaran produksi belum dikonfigurasi."), { status: 503 });
  }
}

function sniffContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "application/pdf";
  return null;
}

function hashHex(data: string | Uint8Array) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function encodeRfc3986(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKeyPath(key: string) {
  return key.split("/").map(encodeRfc3986).join("/");
}

function buildObjectUrl(cfg: S3Config, key: string) {
  const base = new URL(cfg.endpoint);
  const basePath = base.pathname.replace(/\/+$/, "");
  base.pathname = `${basePath}/${encodeRfc3986(cfg.bucket)}/${encodeKeyPath(key)}`;
  base.search = "";
  return base;
}

async function signedS3Request(
  cfg: S3Config,
  method: "PUT" | "GET",
  key: string,
  opts?: { body?: Uint8Array; contentType?: string },
): Promise<Response> {
  const url = buildObjectUrl(cfg, key);
  const body = opts?.body;
  const payloadHash = hashHex(body ?? "");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = url.host;
  const canonicalUri = url.pathname;
  const canonicalQuery = "";

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (opts?.contentType) headers["content-type"] = opts.contentType;

  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${String(headers[k]).trim().replace(/\s+/g, " ")}\n`).join("");
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `${algorithm} Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const reqHeaders: Record<string, string> = {
    Authorization: authorization,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  if (opts?.contentType) reqHeaders["Content-Type"] = opts.contentType;

  return fetch(url.toString(), {
    method,
    headers: reqHeaders,
    body: body as any,
    cache: "no-store",
  });
}

function validateAndPrepare(input: { bytes: Uint8Array }) {
  if (!input.bytes?.byteLength) throw Object.assign(new Error("File bukti kosong."), { status: 400 });
  if (input.bytes.byteLength > MAX_BYTES) throw Object.assign(new Error("Ukuran file bukti melebihi batas."), { status: 400 });
  const sniffed = sniffContentType(input.bytes);
  if (!sniffed || !ALLOWED.has(sniffed)) throw Object.assign(new Error("Tipe/isi file bukti tidak didukung."), { status: 400 });
  const ext = ALLOWED.get(sniffed)!;
  const sha256 = hashHex(input.bytes);
  return { contentType: sniffed, ext, sha256 };
}

async function storeLocal(input: { paymentId: string; bytes: Uint8Array; contentType: string; ext: string; sha256: string }): Promise<StoredProof> {
  const key = `${input.paymentId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${input.ext}`;
  const full = path.join(ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, input.bytes);
  return { key, contentType: input.contentType, size: input.bytes.byteLength, sha256: input.sha256, storage: "local" };
}

async function storeS3(input: { paymentId: string; bytes: Uint8Array; contentType: string; ext: string; sha256: string }): Promise<StoredProof> {
  const cfg = getS3Config()!;
  const key = `${input.paymentId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${input.ext}`;
  const res = await signedS3Request(cfg, "PUT", key, { body: input.bytes, contentType: input.contentType });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error("Gagal menyimpan bukti pembayaran."), { status: 502, detail: detail.slice(0, 300) });
  }
  return { key, contentType: input.contentType, size: input.bytes.byteLength, sha256: input.sha256, storage: "s3" };
}

async function readLocal(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.resolve(/* turbopackIgnore: true */ ROOT, normalized);
  if (!full.startsWith(path.resolve(/* turbopackIgnore: true */ ROOT) + path.sep)) return null;
  try {
    const bytes = await fs.readFile(full); /* turbopackIgnore: true */
    const ext = path.extname(full).slice(1).toLowerCase();
    const ct = [...ALLOWED.entries()].find(([, e]) => e === ext)?.[0];
    return { bytes, contentType: ct };
  } catch {
    return null;
  }
}

async function readS3(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
  const cfg = getS3Config()!;
  const res = await signedS3Request(cfg, "GET", key);
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error("Gagal membaca bukti pembayaran."), { status: 502, detail: detail.slice(0, 300) });
  }
  const ab = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || undefined;
  return { bytes: Buffer.from(ab), contentType: contentType ?? undefined };
}

export async function storePaymentProof(input: {
  paymentId: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<StoredProof> {
  assertStorageAvailable();
  const prepared = validateAndPrepare({ bytes: input.bytes });
  if (wantsS3()) return storeS3({ paymentId: input.paymentId, bytes: input.bytes, ...prepared });
  return storeLocal({ paymentId: input.paymentId, bytes: input.bytes, ...prepared });
}

export async function readPaymentProof(key: string): Promise<{ bytes: Buffer; contentType?: string } | null> {
  assertStorageAvailable();
  const safeKey = key.replace(/^\/+/, "");
  if (!safeKey) return null;
  if (wantsS3()) return readS3(safeKey);
  return readLocal(safeKey);
}
