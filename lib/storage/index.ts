import fs from "fs";
import path from "path";
import crypto from "crypto";
import { put, del } from "@vercel/blob";

// Path for private local fallback storage (outside /public)
const LOCAL_PRIVATE_STORAGE_DIR = path.join(process.cwd(), ".private_storage");

// Helper to resolve Vercel Blob token even if prefixed by Vercel
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.trim().length > 0) {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  // Check if Vercel connected the store with a custom prefix (e.g. DOCSENTIS_BLOB_READ_WRITE_TOKEN)
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.trim().length > 0) {
      if ((key.includes("BLOB") && key.includes("TOKEN")) || key.endsWith("READ_WRITE_TOKEN")) {
        return value.trim();
      }
      if (value.startsWith("vercel_blob_rw_")) {
        return value.trim();
      }
    }
  }
  return undefined;
}

// Ensure directory exists for local private storage
function ensureLocalStorageDir() {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const blobToken = getBlobToken();
    if (!blobToken) {
      const visibleKeys = Object.keys(process.env).filter(
        (k) => !k.startsWith("npm_") && !k.startsWith("__")
      );
      console.error(
        "[Docsentis Storage] BLOB_READ_WRITE_TOKEN is missing in this Vercel deployment! Available env keys:",
        visibleKeys
      );
      throw new Error(
        "Missing BLOB_READ_WRITE_TOKEN in serverless environment. Local disk storage cannot be used on Vercel. Please add BLOB_READ_WRITE_TOKEN to your Vercel Project Environment Variables and redeploy."
      );
    }
  }
  if (!fs.existsSync(LOCAL_PRIVATE_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_PRIVATE_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Validate that a buffer is a genuine PDF file by inspecting magic bytes
 */
export function validatePdfBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (!buffer || buffer.length < 5) {
    return { valid: false, error: "Empty or invalid file data" };
  }

  // Check magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  const header = buffer.subarray(0, 5).toString("utf-8");
  if (!header.startsWith("%PDF-")) {
    return { valid: false, error: "File is not a valid PDF document (magic byte check failed)" };
  }

  return { valid: true };
}

/**
 * Estimate or parse page count from PDF buffer
 */
export function extractPageCount(buffer: Buffer): number {
  try {
    const text = buffer.toString("latin1");
    // Match /Type /Page or /Type/Page but not /Pages
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }

    // Alternative: match /Count (\d+) inside /Pages dict
    const countMatches = text.match(/\/Count\s+(\d+)/);
    if (countMatches && countMatches[1]) {
      const count = parseInt(countMatches[1], 10);
      if (!isNaN(count) && count > 0) {
        return count;
      }
    }
  } catch (e) {
    console.error("Failed to extract page count:", e);
  }
  return 1;
}

export interface UploadResult {
  storageKey: string;
  size: number;
}

/**
 * Store a PDF in private storage (Vercel Blob or local private storage)
 */
export async function uploadPrivateDocument(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<UploadResult> {
  const validation = validatePdfBuffer(fileBuffer);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid PDF file");
  }

  const randomKey = `doc_${crypto.randomBytes(16).toString("hex")}.pdf`;

  // If Vercel Blob token is configured (or any variation/prefix), upload to Vercel Blob
  const blobToken = getBlobToken();
  if (blobToken) {
    const blob = await put(`assignments/${randomKey}`, fileBuffer, {
      access: "public", // We still never share this URL with clients; server fetches it
      addRandomSuffix: false,
      token: blobToken,
    });
    return {
      storageKey: blob.url,
      size: fileBuffer.length,
    };
  }

  // Fallback: Local Private Storage (isolated on server, outside /public)
  ensureLocalStorageDir();
  const filePath = path.join(LOCAL_PRIVATE_STORAGE_DIR, randomKey);
  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    storageKey: `local://${randomKey}`,
    size: fileBuffer.length,
  };
}

/**
 * Retrieve document buffer from private storage (server-side only)
 */
export async function getPrivateDocumentBuffer(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("local://")) {
    const filename = storageKey.replace("local://", "");
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(LOCAL_PRIVATE_STORAGE_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error("Document not found in private storage");
    }

    return await fs.promises.readFile(filePath);
  }

  // Fetch from remote URL (Vercel Blob or S3)
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    const response = await fetch(storageKey);
    if (!response.ok) {
      throw new Error(`Failed to retrieve document from storage: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Invalid storage key format");
}

/**
 * Delete a document from private storage
 */
export async function deletePrivateDocument(storageKey: string): Promise<void> {
  try {
    if (storageKey.startsWith("local://")) {
      const filename = storageKey.replace("local://", "");
      const safeFilename = path.basename(filename);
      const filePath = path.join(LOCAL_PRIVATE_STORAGE_DIR, safeFilename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return;
    }

    const blobToken = getBlobToken();
    if (blobToken && storageKey.startsWith("http")) {
      await del(storageKey, { token: blobToken });
    }
  } catch (err) {
    console.error("Error deleting document from storage:", err);
  }
}
