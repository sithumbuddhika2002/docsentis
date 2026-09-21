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
  X,
  Layers,
  CheckCircle2,
  Scan,
} from "lucide-react";
import DecryptingLoader from "./DecryptingLoader";

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
  const [pdfBinaryReady, setPdfBinaryReady] = useState<boolean>(false);
  const [decryptionDuration, setDecryptionDuration] = useState<number | null>(null);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
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
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Periodic subtle jitter for watermark (every 20 seconds) to prevent watermark subtraction
  useEffect(() => {
    const interval = setInterval(() => {
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
          setRevokedMessage(data.reason || "Your access to this document has been revoked.");
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

  // Fit to Width calculation helper
  const fitToWidth = useCallback(async () => {
    if (!pdfDocRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const unscaled = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const horizontalPadding = window.innerWidth < 640 ? 16 : 48;
      const availableWidth = Math.max(220, containerWidth - horizontalPadding);
      const targetScale = Math.min(
        2.5,
        Math.max(0.35, Number((availableWidth / unscaled.width).toFixed(2)))
      );
      setScale(targetScale);
      setIsFitWidth(true);
    } catch (e) {
      console.error("fitToWidth error:", e);
    }
  }, [currentPage]);

  // Handle window resizing to keep fit-to-width responsive
  useEffect(() => {
    const handleResize = () => {
      if (isFitWidth && pdfDocRef.current) {
        fitToWidth();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFitWidth, fitToWidth]);

  // Initialize PDF.js and load document from authenticated stream
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setLoading(true);
      setPdfBinaryReady(false);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjsLibRef.current = pdfjs;

        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }

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

        // Pre-calculate optimal scale for mobile screens so it renders fit-to-width immediately
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          try {
            const page1 = await doc.getPage(1);
            const unscaled = page1.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
            const padding = window.innerWidth < 640 ? 16 : 32;
            const availableWidth = Math.max(220, containerWidth - padding);
            const targetScale = Math.min(
              2.0,
              Math.max(0.35, Number((availableWidth / unscaled.width).toFixed(2)))
            );
            setScale(targetScale);
            setIsFitWidth(true);
          } catch (e) {
            setScale(0.85);
          }
        }

        // Inform DecryptingLoader that decryption and parsing is complete
        setPdfBinaryReady(true);
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

  // Called when DecryptingLoader finishes its animation & elapsed timing
  const handleDecryptionComplete = useCallback((elapsedSec: number) => {
    setDecryptionDuration(elapsedSec);
    setLoading(false);
  }, []);

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
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  // Touch swipe gestures on mobile for page changes
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Trigger page flip if horizontal swipe is decisive (> 55px) and vertical drift is moderate (< 50px)
    if (Math.abs(diffX) > 55 && Math.abs(diffY) < 50) {
      if (diffX < 0 && currentPage < numPages) {
        setCurrentPage((p) => p + 1);
      } else if (diffX > 0 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Revocation screen
  if (revokedMessage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-border rounded-xl shadow-sm p-8 max-w-md w-full space-y-4">
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
      <header className="bg-white border-b border-border h-14 px-3 sm:px-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <Link
            href={isOwner ? "/dashboard" : "/documents"}
            className="p-2 rounded-lg hover:bg-background text-secondary hover:text-primary transition-colors flex-shrink-0"
            title="Exit Viewer"
            aria-label="Exit Viewer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Docsentis Logo"
                width={32}
                height={32}
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
              />
            </div>
            <span className="hidden xs:inline font-bold text-sm tracking-tight text-primary flex-shrink-0">
              Docsentis
            </span>
            <span className="hidden xs:inline text-secondary-muted">•</span>
            <h1 className="text-xs sm:text-sm font-semibold text-primary truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {initialDocument.title}
            </h1>
          </div>
        </div>

        {/* Security Indicator, Decryption Timing & Mobile Triggers */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
          {/* Decryption duration badge (Desktop) */}
          {decryptionDuration !== null && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Decrypted in {decryptionDuration}s</span>
            </div>
          )}

          {/* Protected viewing banner (Desktop) */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-background border border-border text-xs text-secondary">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium text-primary">Protected Viewing</span>
            <span className="text-secondary-muted">• Download restricted</span>
          </div>

          <div className="hidden xl:flex items-center text-xs text-secondary-muted">
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

          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`md:hidden p-2 rounded-lg text-secondary hover:text-primary transition-colors ${
              isSearchOpen ? "bg-accent/10 text-accent" : "hover:bg-background"
            }`}
            title="Search in document"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile Pages Drawer Trigger */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-background transition-colors flex items-center space-x-1"
            title="View pages"
            aria-label="View pages"
          >
            <Layers className="w-4 h-4 text-secondary" />
          </button>

          {/* Mobile Lock / Decrypted Pill */}
          <div className="sm:hidden flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 text-[10px] font-mono">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>{decryptionDuration !== null ? `${decryptionDuration}s` : "Encrypted"}</span>
          </div>
        </div>
      </header>

      {/* MOBILE EXPANDABLE SEARCH BAR */}
      {isSearchOpen && (
        <div className="md:hidden bg-white border-b border-border px-3 py-2 flex flex-col space-y-2 z-25 shadow-sm animate-fadeIn">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text in document..."
                disabled={loading}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-accent bg-background"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-secondary-muted absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim() || isSearching}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {isSearching ? "Searching..." : "Find"}
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-1.5 text-secondary hover:text-primary rounded-lg"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {searchMatches.length > 0 && (
            <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md px-2 py-1">
              <span>
                Found in {searchMatches.length} {searchMatches.length === 1 ? "page" : "pages"}:
              </span>
              <div className="flex items-center space-x-1">
                {searchMatches.map((m) => (
                  <button
                    key={m.page}
                    onClick={() => setCurrentPage(m.page)}
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                      currentPage === m.page
                        ? "bg-emerald-700 text-white font-bold"
                        : "bg-white text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    p.{m.page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MOBILE PAGES DRAWER (Slide-over) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-slideRight">
            <div className="p-4 border-b border-border flex items-center justify-between bg-background">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-primary">Jump to Page</h3>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-secondary hover:text-primary rounded-md"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-[11px] font-semibold text-secondary-muted uppercase tracking-wider px-1 mb-2">
                All Pages ({numPages})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      currentPage === pageNum
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-background border-border text-primary hover:border-accent/50"
                    }`}
                  >
                    <span className="text-xs font-bold">Page {pageNum}</span>
                    <span
                      className={`text-[10px] ${
                        currentPage === pageNum ? "text-white/80" : "text-secondary-muted"
                      }`}
                    >
                      {currentPage === pageNum ? "Active" : "Open"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-border bg-background text-center">
              <span className="text-xs text-secondary-muted font-mono">
                Currently on Page {currentPage} of {numPages}
              </span>
            </div>
          </div>
        </div>
      )}

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
        {/* overflow-auto with flex-col & items-center safe centering */}
        <main
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-auto p-2 sm:p-6 md:p-8 relative bg-[#E9ECEF] flex flex-col items-center select-none secure-viewer-no-select"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="m-auto w-full max-w-lg py-4">
              <DecryptingLoader
                documentTitle={initialDocument.title}
                documentDescription={initialDocument.description}
                isReady={pdfBinaryReady}
                onComplete={handleDecryptionComplete}
              />
            </div>
          ) : (
            <div className="my-auto mx-auto inline-block relative shadow-2xl rounded-sm overflow-hidden bg-white border border-border flex-shrink-0 transition-transform duration-150">
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
                className="absolute inset-0 z-20 pointer-events-none overflow-hidden flex flex-wrap items-center justify-center gap-12 sm:gap-20 opacity-20 transition-transform duration-1000 ease-out select-none"
                style={{
                  transform: `translate(${watermarkJitter.x}px, ${watermarkJitter.y}px)`,
                }}
              >
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="transform -rotate-25 text-center font-mono leading-tight flex-shrink-0"
                    style={{ minWidth: "220px" }}
                  >
                    <div className="text-[11px] sm:text-xs font-black text-primary tracking-widest uppercase">
                      DOCSENTIS SECURE VIEWER
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-semibold text-secondary">
                      AUTHORIZED: {initialWatermark.userEmail}
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-secondary truncate max-w-[220px]">
                      DOC: {initialWatermark.title}
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-secondary-muted">
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
      <footer className="bg-white border-t border-border px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between z-30 flex-shrink-0 gap-2">
        {/* Left: Page Navigation with Mobile Drawer Trigger */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            className="p-2 sm:p-1.5 rounded-lg sm:rounded border border-border hover:border-secondary-muted disabled:opacity-40 disabled:hover:border-border text-secondary hover:text-primary transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Interactive page badge that triggers drawer on mobile */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="px-2 py-1 rounded-md hover:bg-background border border-border text-xs font-mono text-primary flex items-center space-x-1 transition-colors"
            title="Select page"
          >
            <span className="font-bold">{currentPage}</span>
            <span className="text-secondary-muted">/</span>
            <span>{numPages}</span>
            <Layers className="w-3 h-3 text-secondary-muted ml-0.5 lg:hidden" />
          </button>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || loading}
            className="p-2 sm:p-1.5 rounded-lg sm:rounded border border-border hover:border-secondary-muted disabled:opacity-40 disabled:hover:border-border text-secondary hover:text-primary transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom & Fit-to-Width Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => {
              setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
              setIsFitWidth(false);
            }}
            disabled={loading}
            className="p-2 sm:p-1.5 rounded-lg sm:rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium text-primary w-11 sm:w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => {
              setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))));
              setIsFitWidth(false);
            }}
            disabled={loading}
            className="p-2 sm:p-1.5 rounded-lg sm:rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Fit to Width Button (Mobile & Desktop) */}
          <button
            onClick={fitToWidth}
            disabled={loading}
            className={`p-2 sm:p-1.5 rounded-lg sm:rounded border transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
              isFitWidth
                ? "bg-accent text-white border-accent shadow-xs"
                : "border-border hover:border-secondary-muted text-secondary hover:text-primary"
            }`}
            title="Fit to Screen Width"
            aria-label="Fit to Screen Width"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom Button (Desktop) */}
          <button
            onClick={() => {
              setScale(1.2);
              setIsFitWidth(false);
            }}
            disabled={loading}
            className="p-1.5 rounded border border-border hover:border-secondary-muted text-secondary hover:text-primary transition-colors hidden sm:flex items-center justify-center min-w-[34px] min-h-[34px]"
            title="120% Zoom"
            aria-label="Default zoom"
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
              aria-label="Search"
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
