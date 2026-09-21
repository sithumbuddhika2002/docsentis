"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  AlertTriangle,
  FileText,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

interface WatermarkData {
  brand: string;
  userEmail: string;
  ownerName: string;
  ownerEmail: string;
  title: string;
  sessionId: string;
  timestamp: string;
}

interface SecurePdfViewerProps {
  documentId: string;
  initialDocument: {
    id: string;
    title: string;
    pageCount: number;
    description?: string;
  };
  initialSessionToken: string;
  initialWatermark: WatermarkData;
  isOwner?: boolean;
}

export default function SecurePdfViewer({
  documentId,
  initialDocument,
  initialSessionToken,
  initialWatermark,
  isOwner,
}: SecurePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(initialDocument.pageCount || 1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchMatches, setSearchMatches] = useState<{ page: number; count: number }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [watermarkJitter, setWatermarkJitter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfjsLibRef = useRef<any>(null);

  // Periodic subtle jitter for watermark (every 20 seconds) to prevent watermark subtraction
  useEffect(() => {
    const interval = setInterval(() => {
      // Small random shift between -12px and +12px
      const offsetX = Math.floor(Math.random() * 24) - 12;
      const offsetY = Math.floor(Math.random() * 24) - 12;
      setWatermarkJitter({ x: offsetX, y: offsetY });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Anti-download keyboard deterrents & context menu suppression
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      // Suppress Ctrl+S (Save), Ctrl+P (Print), Ctrl+U (View Source), Ctrl+C (Copy)
      if (
        (isCtrlOrCmd && ["s", "p", "u", "c"].includes(e.key.toLowerCase())) ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Heartbeat verification every 25 seconds
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/viewer/${documentId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: initialSessionToken }),
        });

        const data = await res.json();
        if (!res.ok || !data.valid) {
          // Access has been revoked or expired!
          setRevokedMessage(data.reason || "Your access to this document has been revoked.");
          // Clear canvas immediately
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      } catch (err) {
        console.error("Heartbeat error", err);
      }
    }, 25000);

    return () => clearInterval(heartbeatInterval);
  }, [documentId, initialSessionToken]);

  // Initialize PDF.js and load document from authenticated stream
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setLoading(true);
      try {
        // Dynamically import pdfjs-dist on client side
        const pdfjs = await import("pdfjs-dist");
        pdfjsLibRef.current = pdfjs;

        // Configure PDF.js worker (use local worker served from public directory)
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }

        // Fetch PDF binary with short-lived session token
        const response = await fetch(
          `/api/viewer/${documentId}/content?token=${encodeURIComponent(initialSessionToken)}`
        );

        if (!response.ok) {
          if (response.status === 403 || response.status === 410) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error || "Access revoked or expired.");
          }
          throw new Error("Failed to load document content.");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error("PDF load error:", err);
          setRevokedMessage(err.message || "Failed to load document.");
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [documentId, initialSessionToken]);

  // Render current page to canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDocRef.current.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      // Handle high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Page render error:", err);
      }
    }
  }, [currentPage, scale]);

  useEffect(() => {
    if (!loading && !revokedMessage) {
      renderCurrentPage();
    }
  }, [currentPage, scale, loading, revokedMessage, renderCurrentPage]);

  // Document text search across pages
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfDocRef.current || !searchQuery.trim()) return;

    setIsSearching(true);
    const query = searchQuery.trim().toLowerCase();
    const matches: { page: number; count: number }[] = [];

    try {
      for (let i = 1; i <= pdfDocRef.current.numPages; i++) {
        const page = await pdfDocRef.current.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(" ").toLowerCase();

        const count = (text.match(new RegExp(query, "g")) || []).length;
        if (count > 0) {
          matches.push({ page: i, count });
        }
      }

      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentPage(matches[0].page);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // If permission revoked, show clean revocation screen
  if (revokedMessage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-border rounded-lg shadow-sm p-8 max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-light text-danger flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-primary">Access Restricted</h2>
          <p className="text-sm text-secondary leading-relaxed">{revokedMessage}</p>
          <div className="text-xs text-secondary-muted pt-2 border-t border-border">
            Document viewing sessions are continuously verified by Docsentis Security. If you believe this is an error, please contact your university instructor or document owner.
          </div>
          <div className="pt-2">
            <Link
              href={isOwner ? "/dashboard" : "/documents"}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-light transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isOwner ? "Back to Dashboard" : "Back to Assignments"}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] select-none secure-viewer-no-select overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-border h-14 px-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center space-x-3 truncate">
          <Link
            href={isOwner ? "/dashboard" : "/documents"}
            className="p-1.5 rounded hover:bg-background text-secondary hover:text-primary transition-colors flex-shrink-0"
            title="Exit Viewer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center space-x-2 truncate">
            <div className="h-9 w-9 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Docsentis Logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <span className="font-bold text-sm tracking-tight text-primary flex-shrink-0">Docsentis</span>
            <span className="text-secondary-muted">•</span>
            <h1 className="text-xs sm:text-sm font-semibold text-primary truncate max-w-xs sm:max-w-md">
              {initialDocument.title}
            </h1>
          </div>
        </div>

        {/* Security Indicator & Credit */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-background border border-border text-xs text-secondary">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium text-primary">Protected Viewing</span>
            <span className="text-secondary-muted">• Download restricted</span>
          </div>

          <div className="hidden md:flex items-center text-xs text-secondary-muted">
            <span>Developed by </span>
            <a
              href="https://www.peaksora.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-semibold text-accent hover:underline"
            >
              PEAKSORA
            </a>
          </div>

          <div className="sm:hidden p-1.5 text-accent">
            <Lock className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* 2. VIEWER MAIN BODY (Sidebar + Canvas Viewport) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Thumbnail / Page List Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-48 bg-white border-r border-border flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-border bg-background flex items-center justify-between text-xs font-semibold text-secondary uppercase tracking-wider">
            <span>Pages ({numPages})</span>
            <span className="text-[11px] font-mono text-secondary-muted">#{currentPage}</span>
          </div>

          <div className="p-3 space-y-2">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-full p-2 rounded text-left flex items-center justify-between text-xs transition-colors ${
                  currentPage === pageNum
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "text-secondary hover:bg-background border border-border hover:border-secondary-muted"
                }`}
              >
                <span>Page {String(pageNum).padStart(2, "0")}</span>
                {currentPage === pageNum && <span className="text-[10px] uppercase">Active</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Document Viewport + Dynamic Watermark */}
        <main
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 relative bg-[#E9ECEF]"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="text-center p-8 bg-white rounded-lg border border-border shadow-sm">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-sm font-semibold text-primary">Decrypting and loading document...</div>
              <div className="text-xs text-secondary-muted mt-1">Applying dynamic Docsentis watermarks</div>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white border border-border">
              {/* Canvas rendering target */}
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* Invisible interaction shield preventing direct canvas extraction or dragging */}
              <div
                className="absolute inset-0 z-10 cursor-default"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />

              {/* DOCSENTIS DYNAMIC WATERMARK OVERLAY */}
              <div
                className="absolute inset-0 z-20 pointer-events-none overflow-hidden flex flex-wrap items-center justify-center gap-16 sm:gap-24 opacity-20 transition-transform duration-1000 ease-out select-none"
                style={{
                  transform: `translate(${watermarkJitter.x}px, ${watermarkJitter.y}px)`,
                }}
              >
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="transform -rotate-25 text-center font-mono leading-tight flex-shrink-0"
                    style={{ minWidth: "260px" }}
                  >
                    <div className="text-xs font-black text-primary tracking-widest uppercase">
                      DOCSENTIS SECURE VIEWER
                    </div>
                    <div className="text-[10px] font-semibold text-secondary">
                      AUTHORIZED: {initialWatermark.userEmail}
                    </div>
                    <div className="text-[9px] text-secondary truncate max-w-[240px]">
                      DOC: {initialWatermark.title}
                    </div>
                    <div className="text-[9px] text-secondary-muted">
                      SESSION: {initialWatermark.sessionId} • {initialWatermark.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. BOTTOM CONTROLS TOOLBAR */}
      <footer className="bg-white border-t border-border px-4 py-2.5 flex items-center justify-between z-30 flex-shrink-0">
        {/* Left: Page Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted disabled:opacity-40 disabled:hover:border-border text-secondary hover:text-primary transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono text-primary flex items-center space-x-1">
            <span className="font-semibold">{currentPage}</span>
            <span className="text-secondary-muted">/</span>
            <span>{numPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted disabled:opacity-40 disabled:hover:border-border text-secondary hover:text-primary transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            disabled={loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium text-primary w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            disabled={loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setScale(1.2)}
            disabled={loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors hidden sm:block"
            title="Reset zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Search in Document (Desktop) */}
        <div className="hidden md:flex items-center space-x-2">
          <form onSubmit={handleSearch} className="flex items-center space-x-1.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search document..."
                disabled={loading}
                className="w-36 lg:w-48 px-2.5 py-1 text-xs rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-background"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim() || isSearching}
              className="p-1.5 bg-primary text-white rounded text-xs hover:bg-primary-light disabled:opacity-50 transition-colors"
              title="Search"
            >
              {isSearching ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {searchMatches.length > 0 && (
            <span className="text-[11px] font-medium text-success-text bg-success-light px-2 py-0.5 rounded">
              Found on {searchMatches.length} {searchMatches.length === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
