"use client";
import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const hRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const hovering = useRef(false);

  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    if (!enabled.matches) return;
    document.documentElement.classList.add("custom-cursor-active");
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      hovering.current = !!(e.target as Element).closest("a,button,[data-hover],input,textarea");
    };
    document.addEventListener("mousemove", onMove);

    const tick = () => {
      const { x, y } = pos.current;
      const s = hovering.current ? "scale(2.5)" : "scale(1)";
      if (hRef.current) {
        hRef.current.style.transform = `translateY(${y}px)`;
        hRef.current.style.opacity = hovering.current ? "0.3" : "0.18";
      }
      if (vRef.current) {
        vRef.current.style.transform = `translateX(${x}px)`;
        vRef.current.style.opacity = hovering.current ? "0.3" : "0.18";
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x - 3}px, ${y - 3}px) ${s}`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="custom-cursor" aria-hidden="true">
      {/* Horizontal line */}
      <div
        ref={hRef}
        className="fixed left-0 right-0 top-0 h-px pointer-events-none z-[9995]"
        style={{ background: "var(--teal)", willChange: "transform" }}
      />
      {/* Vertical line */}
      <div
        ref={vRef}
        className="fixed top-0 bottom-0 left-0 w-px pointer-events-none z-[9995]"
        style={{ background: "var(--teal)", willChange: "transform" }}
      />
      {/* Center dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full pointer-events-none z-[9996]"
        style={{
          background: "var(--teal)",
          boxShadow: "0 0 6px var(--teal)",
          willChange: "transform",
          transition: "transform 0.12s ease",
        }}
      />
    </div>
  );
}
