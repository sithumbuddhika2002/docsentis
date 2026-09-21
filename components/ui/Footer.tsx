import React from "react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border py-6 text-xs text-secondary-muted mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <Image
            src="/logo.png"
            alt="Docsentis Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-primary text-sm">Docsentis</span>
            <span>•</span>
            <span>Secure University Assignment Viewer</span>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <span>Developed by </span>
          <a
            href="https://www.peaksora.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent hover:underline transition-colors"
          >
            PEAKSORA
          </a>
        </div>
      </div>
    </footer>
  );
}
