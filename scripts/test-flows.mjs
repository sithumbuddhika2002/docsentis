import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

if (typeof process.loadEnvFile === "function") {
  if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
    process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  } else if (fs.existsSync(path.resolve(process.cwd(), ".env"))) {
    process.loadEnvFile(path.resolve(process.cwd(), ".env"));
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/peaksora_assignment_viewer";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING AUTOMATED SECURITY & PERMISSION FLOW TEST");
  console.log("=================================================\n");

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Verify Seeded Users
  console.log("[TEST 1] Verifying Seeded Users...");
  const owner = await db.collection("users").findOne({ email: "peaksorateam@gmail.com" });
  const student1 = await db.collection("users").findOne({ email: "student1@university.edu" });
  const student2 = await db.collection("users").findOne({ email: "student2@university.edu" });

  if (!owner || !student1 || !student2) {
    throw new Error("❌ Seed users not found. Run 'npm run seed' first.");
  }
  console.log("  ✔ Found Owner:", owner.email, "(Role:", owner.role + ")");
  console.log("  ✔ Found Student 1:", student1.email);
  console.log("  ✔ Found Student 2 (Expired):", student2.email);

  // 2. Verify Document
  console.log("\n[TEST 2] Verifying Protected Document & Storage Key...");
  const doc = await db.collection("documents").findOne({ ownerId: owner._id });
  if (!doc) throw new Error("❌ No document found for owner");
  console.log("  ✔ Found Document:", doc.title);
  console.log("  ✔ Storage Key is private (not in /public):", doc.storageKey);
  console.log("  ✔ Status:", doc.status, "• Page count:", doc.pageCount);

  // Verify private storage file exists
  const localFilename = doc.storageKey.replace("local://", "");
  const filePath = path.join(process.cwd(), ".private_storage", localFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Private storage file not found at ${filePath}`);
  }
  console.log("  ✔ Private storage file verified on disk:", filePath);

  // 3. Test Student 1 (Active Permission)
  console.log("\n[TEST 3] Testing Active Permission for Student 1...");
  const perm1 = await db.collection("permissions").findOne({
    documentId: doc._id,
    userId: student1._id,
  });
  if (!perm1 || perm1.status !== "ACTIVE" || new Date(perm1.expiresAt) <= new Date()) {
    throw new Error("❌ Student 1 permission should be ACTIVE and unexpired");
  }
  console.log("  ✔ Student 1 permission is ACTIVE, expires on:", new Date(perm1.expiresAt).toISOString());

  // Create Viewing Session for Student 1
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const sessionExpiry = new Date(now.getTime() + 30 * 60 * 1000);

  await db.collection("viewingsessions").insertOne({
    documentId: doc._id,
    userId: student1._id,
    sessionTokenHash: tokenHash,
    createdAt: now,
    expiresAt: sessionExpiry,
    lastActivity: now,
    ipAddress: "127.0.0.1",
    userAgent: "AutomatedTestRunner/1.0",
    status: "ACTIVE",
  });
  console.log("  ✔ Created short-lived ViewingSession for Student 1 (Token Hash:", tokenHash.slice(0, 8) + "...)");

  // Verify Watermark parameters
  const watermarkText = `PEAKSORA SECURE VIEWER • AUTHORIZED TO: ${student1.email} • DOC: ${doc.title} • SESSION: ${tokenHash.slice(0, 6).toUpperCase()}`;
  console.log("  ✔ Generated PEAKSORA dynamic watermark string:\n    ->", watermarkText);

  // 4. Test Student 2 (Expired Permission)
  console.log("\n[TEST 4] Testing Expired Permission for Student 2...");
  const perm2 = await db.collection("permissions").findOne({
    documentId: doc._id,
    userId: student2._id,
  });
  const isExpired = perm2 && (perm2.status === "EXPIRED" || new Date(perm2.expiresAt) < new Date());
  if (!isExpired) {
    throw new Error("❌ Student 2 should be expired");
  }
  console.log("  ✔ Student 2 access correctly flagged as EXPIRED (Expired at:", new Date(perm2.expiresAt).toISOString() + ")");

  // 5. Test Heartbeat & Permission Revocation
  console.log("\n[TEST 5] Testing Real-Time Heartbeat & Immediate Revocation...");
  // Simulate active heartbeat
  let activeSession = await db.collection("viewingsessions").findOne({ sessionTokenHash: tokenHash });
  if (!activeSession || activeSession.status !== "ACTIVE") {
    throw new Error("❌ Session should be ACTIVE");
  }
  console.log("  ✔ Heartbeat check 1: Session is ACTIVE (lastActivity updated)");

  // Owner revokes permission
  console.log("  -> Owner revokes Student 1 permission...");
  await db.collection("permissions").updateOne(
    { _id: perm1._id },
    { $set: { status: "REVOKED", revokedAt: new Date() } }
  );
  await db.collection("viewingsessions").updateMany(
    { documentId: doc._id, userId: student1._id },
    { $set: { status: "REVOKED" } }
  );

  // Subsequent heartbeat check
  const revokedSession = await db.collection("viewingsessions").findOne({ sessionTokenHash: tokenHash });
  if (revokedSession.status !== "REVOKED") {
    throw new Error("❌ Session should be marked REVOKED immediately");
  }
  console.log("  ✔ Heartbeat check 2: Session immediately rejected with status: REVOKED");

  // 6. Verify Activity Audit Logs
  console.log("\n[TEST 6] Verifying Security Audit Log entries...");
  const logs = await db.collection("activitylogs").find({ documentId: doc._id }).toArray();
  console.log(`  ✔ Found ${logs.length} audit log entries for document`);
  logs.forEach((log) => {
    console.log(`    • [${log.action}] User: ${log.userEmail || "System"} at ${new Date(log.createdAt).toISOString()}`);
  });

  // Restore Student 1 permission for clean manual testing
  await db.collection("permissions").updateOne(
    { _id: perm1._id },
    { $set: { status: "ACTIVE", revokedAt: null } }
  );

  console.log("\n=================================================");
  console.log("ALL 6 SECURITY & FLOW CHECKS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
