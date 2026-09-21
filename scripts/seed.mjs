import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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

// Minimal valid multi-page PDF generator helper
function createMinimalPdfBuffer(title, pageCount = 3) {
  let objects = [];
  let offsets = [];

  const addObj = (content) => {
    objects.push(content);
    return objects.length;
  };

  // 1: Catalog
  addObj("<< /Type /Catalog /Pages 2 0 R >>");

  // 2: Pages list
  let pageRefs = [];
  for (let i = 0; i < pageCount; i++) {
    pageRefs.push(`${3 + i * 2} 0 R`);
  }
  addObj(`<< /Type /Pages /Kids [ ${pageRefs.join(" ")} ] /Count ${pageCount} >>`);

  // Create pages
  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const contentStream = `BT /F1 16 Tf 50 750 Td (${title} - Page ${pageNum}) Tj ET\nBT /F1 12 Tf 50 700 Td (University Academic Integrity Notice: Protected Viewing Only) Tj ET\nBT /F1 10 Tf 50 650 Td (1. Design a fault-tolerant consensus protocol for a network of N distributed nodes.) Tj ET\nBT /F1 10 Tf 50 600 Td (2. Explain how vector clocks prevent causal anomalies during network partitions.) Tj ET`;
    const streamLen = contentStream.length;

    // Page object
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`);

    // Stream object
    addObj(`<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream`);
  }

  // Assemble PDF
  let pdf = "%PDF-1.4\n";
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let off of offsets) {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  return Buffer.from(pdf, "utf-8");
}

async function seed() {
  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  const db = mongoose.connection.db;

  // Clear existing collections for a clean seed
  console.log("Resetting collections...");
  try {
    await db.collection("users").drop();
    await db.collection("documents").drop();
    await db.collection("permissions").drop();
    await db.collection("viewingsessions").drop();
    await db.collection("activitylogs").drop();
  } catch (e) {
    // Ignore if collections don't exist yet
  }

  const salt = await bcrypt.genSalt(10);
  const studentPasswordHash = await bcrypt.hash("password123", salt);
  const ownerPasswordHash = await bcrypt.hash("Peaksora@2002", salt);

  // 1. Create Users
  const ownerId = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();

  await db.collection("users").insertMany([
    {
      _id: ownerId,
      name: "PEAKSORA Owner",
      email: "peaksorateam@gmail.com",
      passwordHash: ownerPasswordHash,
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: student1Id,
      name: "Sarah Connor",
      email: "student1@university.edu",
      passwordHash: studentPasswordHash,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: student2Id,
      name: "David Miller",
      email: "student2@university.edu",
      passwordHash: studentPasswordHash,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log("Users created: peaksorateam@gmail.com, student1@university.edu, student2@university.edu");

  // 2. Create Sample PDF and store in local private storage
  const storageDir = path.join(process.cwd(), ".private_storage");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const pdfBuffer = createMinimalPdfBuffer("CS401 - Distributed Systems Assignment 2", 4);
  const randomKey = `doc_${crypto.randomBytes(16).toString("hex")}.pdf`;
  fs.writeFileSync(path.join(storageDir, randomKey), pdfBuffer);

  const docId = new mongoose.Types.ObjectId();
  await db.collection("documents").insertOne({
    _id: docId,
    ownerId,
    title: "CS401 - Distributed Systems Assignment 2",
    description: "Coursework on consensus protocols, Byzantine fault tolerance, and vector clocks. Strict viewing only.",
    storageKey: `local://${randomKey}`,
    fileSize: pdfBuffer.length,
    mimeType: "application/pdf",
    pageCount: 4,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Sample protected document created in private storage:", docId.toString());

  // 3. Grant Permissions
  const now = new Date();
  const activeExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  const expiredDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  await db.collection("permissions").insertMany([
    {
      documentId: docId,
      userId: student1Id,
      grantedBy: ownerId,
      expiresAt: activeExpiry,
      status: "ACTIVE",
      createdAt: now,
    },
    {
      documentId: docId,
      userId: student2Id,
      grantedBy: ownerId,
      expiresAt: expiredDate,
      status: "EXPIRED",
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("Permissions seeded: student1 (ACTIVE), student2 (EXPIRED)");

  // 4. Seed Activity Logs
  await db.collection("activitylogs").insertMany([
    {
      documentId: docId,
      documentTitle: "CS401 - Distributed Systems Assignment 2",
      userId: ownerId,
      userEmail: "peaksorateam@gmail.com",
      action: "DOCUMENT_UPLOADED",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      details: { fileSize: pdfBuffer.length, pageCount: 4 },
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
    {
      documentId: docId,
      documentTitle: "CS401 - Distributed Systems Assignment 2",
      userId: ownerId,
      userEmail: "peaksorateam@gmail.com",
      action: "PERMISSION_GRANTED",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      details: { targetUserEmail: "student1@university.edu", expiresAt: activeExpiry.toISOString() },
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      documentId: docId,
      documentTitle: "CS401 - Distributed Systems Assignment 2",
      userId: student1Id,
      userEmail: "student1@university.edu",
      action: "DOCUMENT_VIEWED",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      details: { sessionId: "A7F3K2" },
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
  ]);

  console.log("Activity logs seeded.");
  console.log("\n=======================================================");
  console.log("SEED COMPLETE!");
  console.log("Owner login:     peaksorateam@gmail.com / Peaksora@2002");
  console.log("Student login:   student1@university.edu / password123");
  console.log("Expired student: student2@university.edu / password123");
  console.log("Sample Document ID:", docId.toString());
  console.log("Direct Viewer URL: http://localhost:3000/viewer/" + docId.toString());
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
