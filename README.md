# PEAKSORA • Secure University Assignment Viewer

A production-ready, security-focused web platform engineered for sharing university assignment documents with selected, authorized students. Built on **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **MongoDB**.

Documents are strictly safeguarded in **private object storage** and rendered in a **custom canvas viewer** with **dynamic PEAKSORA forensic watermarks**, **anti-download deterrents**, and a **25-second heartbeat engine** that detects revoked permissions in real-time.

---

## Key Features

### 1. Document Owner & Instructor Controls
- **Secure Authentication**: Session-based authentication with bcrypt password hashing and role-based access (`OWNER`, `USER`, `ADMIN`).
- **Drag-and-Drop PDF Upload**: Automatic PDF magic bytes validation (`%PDF-`), file size constraints (up to 25MB), page count extraction, and private storage placement.
- **Granular Permission Management**:
  - Add authorized students by email.
  - Set exact expiration date and time.
  - Instant access revocation with one click.
  - Live status pills: `Active`, `Expiring Soon` (<24h), `Expired`, `Revoked`.
- **Document Operations**:
  - Replace uploaded document while preserving permissions and audit history.
  - Temporarily disable/re-enable student access without deleting the document.
  - Delete document and automatically purge private storage files.
- **Audit Logging**: Immutable event logging for uploads, viewing sessions, permission updates, access denials, and IP/user agent records.

### 2. Protected Student Experience
- **Filtered Document Portal**: Students only see assignments they have been explicitly granted permission to access.
- **Direct Canvas PDF Viewer**:
  - Renders pages directly to HTML5 `<canvas>` via PDF.js, completely bypassing default browser PDF plugin bars (which include download, save, and print buttons).
  - Virtualized page rendering for smooth navigation and minimal memory footprint.
  - Document text search and page jumping.
  - Zoom controls (zoom in/out, fit to width, scale percentage).
- **Responsive Layout**:
  - **Desktop**: Left thumbnail/page sidebar + main canvas viewport + bottom control bar.
  - **Mobile**: Minimalist top bar with title and lock indicator + touch scrolling + compact bottom toolbar.

### 3. Security Architecture & Anti-Download Deterrence
- **Zero Public File URLs**: Assignment files are never placed in `/public` or `/uploads`. Raw storage URLs are never exposed in HTML or client network responses.
- **Dynamic PEAKSORA Watermark**:
  - Overlaid diagonally across the entire viewing area above the canvas.
  - Displays: `PEAKSORA SECURE VIEWER • AUTHORIZED TO: student@university.edu • DOC: Title • SESSION: A7F3K2 • Date/Time`.
  - Subtle styling (`#344054` at 0.12 opacity, rotated -25°) makes screenshots traceable without interfering with readability.
  - Periodic micro-jitter (shifts offset every 20 seconds) prevents simple watermark subtraction.
- **Anti-Download Deterrents**:
  - Suppresses right-click context menus (`contextmenu` blocked).
  - Blocks common keyboard shortcuts: `Ctrl+S`, `Cmd+S`, `Ctrl+P`, `Cmd+P`, `Ctrl+U`, `Cmd+U`, `Ctrl+C`.
  - Disables text selection (`user-select: none`) and drag-and-drop on the document surface.
  - Clear, honest security posture: Described as *"Protected viewing • Download restricted"* without making false claims like "100% screenshot-proof".
- **Real-Time Revocation & Heartbeat**:
  - The viewer pings `/api/viewer/[id]/heartbeat` every 25 seconds.
  - If permission is revoked or expired while a student is reading, the heartbeat immediately wipes the canvas and displays *"Your access to this document has been revoked."*

---

## Free Vercel Deployment Guide (100% Free Tier)

This application is optimized to run entirely within **free-tier services**:
1. **Vercel Hobby Plan (Free)**: Hosts Next.js with global Edge/Serverless execution.
2. **MongoDB Atlas M0 Sandbox (Free Forever)**: 512 MB managed database.
3. **Vercel Blob Storage (Free Tier)**: 1 GB storage, 10,000 reads, 2,000 writes/month.

### Step 1: Set Up Free MongoDB Atlas
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create an **M0 (Free)** cluster.
3. Under **Database Access**, create a database user and password.
4. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** → **Drivers** and copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/peaksora_viewer?retryWrites=true&w=majority
   ```

### Step 2: Set Up Free Vercel Blob Storage
1. In your Vercel Dashboard, navigate to **Storage** → **Create Database** → select **Blob**.
2. Name your store (e.g., `peaksora-blob`) and create it on the Free plan.
3. Copy the generated `BLOB_READ_WRITE_TOKEN`.

### Step 3: Deploy to Vercel
1. Push your repository to GitHub or GitLab.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Configure the following **Environment Variables** in Vercel:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `MONGODB_URI` | `mongodb+srv://...` | From MongoDB Atlas |
   | `AUTH_SECRET` | `generate-with-openssl-rand-base64-32` | 32+ char secret for JWT cookies |
   | `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Your Vercel production URL |
   | `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | From Vercel Blob store |
4. Click **Deploy**.

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node v20 / v24)
- Local MongoDB instance or free MongoDB Atlas URI

### 1. Clone & Install
```bash
git clone <repo-url>
cd Assignment_Viewe
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your `MONGODB_URI` and `AUTH_SECRET`. If `BLOB_READ_WRITE_TOKEN` is left empty, the application automatically uses the built-in isolated private storage (`.private_storage/`).

### 3. Seed Database with Test Accounts
Run the seed script to populate sample accounts, a sample protected assignment PDF, permissions, and audit logs:
```bash
npm run seed
```

**Seeded Test Accounts**:
| Role | Email | Password | Access Status |
| :--- | :--- | :--- | :--- |
| **Instructor / Owner** | `owner@university.edu` | `password123` | Full Owner permissions |
| **Authorized Student** | `student1@university.edu` | `password123` | Active permission (14 days) |
| **Expired Student** | `student2@university.edu` | `password123` | Expired permission (410 state) |

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Security Verification
Execute the end-to-end security test suite:
```bash
node scripts/test-flows.mjs
```

---

## Production Security Checklist
- [x] **No Public Files**: Private files stored outside `/public` with random UUID keys.
- [x] **Strict Server Authorization**: Every document stream request requires session verification.
- [x] **Short-Lived Sessions**: Viewing tokens expire automatically and cannot be reused across users.
- [x] **Real-Time Revocation**: 25-second heartbeat detects immediate access revocations.
- [x] **Anti-Download Protections**: Right-click, print, and save keyboard shortcuts disabled.
- [x] **PEAKSORA Watermarking**: High-contrast, dynamic, traceable watermark overlaid on all pages.
- [x] **Security Headers**: HSTS, Content Security Policy, nosniff, frame-ancestors 'none'.
- [x] **Accessible UI**: High-contrast typography (`#172033` on `#FFFFFF`), visible focus rings, responsive layouts.
