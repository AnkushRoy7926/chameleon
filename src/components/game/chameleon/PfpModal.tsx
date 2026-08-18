"use client";

import { useEffect } from "react";

interface PfpModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function PfpModal({ src, alt, onClose }: PfpModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="pfp-modal-overlay" onClick={onClose}>
      <div className="pfp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="pfp-modal-close" onClick={onClose} aria-label="Close">
          &#x2715;
        </button>
        <img src={src} alt={alt} className="pfp-modal-img" />
        <div className="pfp-modal-name">{alt}</div>
      </div>
    </div>
  );
}
