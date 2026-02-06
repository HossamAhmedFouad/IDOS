"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* Classic arrow pointer shape — hotspot at (0,0) top-left */
function ArrowSvg({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
    >
      <path
        d="M0 0v14h6v8l8-14 10-8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Hand pointer for links/buttons */
function HandSvg({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
    >
      <path
        d="M7 11V8a2.5 2.5 0 0 1 5 0v4.5m-5-2.5v1m0 2.5v5.5m5-9h2a2 2 0 0 1 2 2v3m-4 0h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const el = target.closest(
        "a, button, [role='button'], input, textarea, select, [data-cursor-pointer]"
      );
      setIsPointer(!!el);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    document.body.setAttribute("data-idos-cursor", "enabled");

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.body.removeAttribute("data-idos-cursor");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[9999] text-foreground"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
    >
      <motion.div
        className="origin-top-left"
        animate={{ scale: isPointer ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {isPointer ? (
          <HandSvg className="h-[22px] w-[22px] text-primary" />
        ) : (
          <ArrowSvg className="h-6 w-6 text-foreground" />
        )}
      </motion.div>
    </motion.div>
  );
}
