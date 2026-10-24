"use client";
import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "a,button,[data-hover],input,textarea,select,label,summary";
const DOT_RADIUS = 3;
const LINE_OFFSET = 0.5;
const OFFSCREEN = "translate3d(-100px, -100px, 0)";

export default function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    if (!enabled.matches) return;

    const html = document.documentElement;
    const root = rootRef.current;
    html.classList.add("custom-cursor-active");

    const moveTo = (x: number, y: number) => {
      // Position each layer directly on the compositor — no easing, so the
      // crosshair stays locked to the hardware pointer.
      if (hRef.current) hRef.current.style.transform = `translate3d(0, ${y - LINE_OFFSET}px, 0)`;
      if (vRef.current) vRef.current.style.transform = `translate3d(${x - LINE_OFFSET}px, 0, 0)`;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x - DOT_RADIUS}px, ${y - DOT_RADIUS}px, 0)`;
      }
    };

    let hovered: boolean | null = null;
    let lastTarget: EventTarget | null = null;

    const setHovered = (next: boolean) => {
      if (next === hovered) return;
      hovered = next;
      if (root) root.dataset.hover = next ? "true" : "false";
    };

    const onPointerUpdate = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;

      moveTo(event.clientX, event.clientY);

      if (event.target !== lastTarget) {
        lastTarget = event.target;
        setHovered(event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR) !== null);
      }
    };

    // Start out of view; the first real pointer event places the cursor.
    moveTo(-100, -100);

    // pointerrawupdate is dispatched as soon as the hardware reports movement,
    // removing the frame alignment delay that pointermove can add. Fall back to
    // pointermove where the raw event is unavailable (non-secure contexts, Safari, Firefox).
    const useRawUpdates = window.isSecureContext && "onpointerrawupdate" in window;
    const moveEvent = useRawUpdates ? "pointerrawupdate" : "pointermove";
    window.addEventListener(moveEvent, onPointerUpdate as EventListener, { passive: true });

    return () => {
      window.removeEventListener(moveEvent, onPointerUpdate as EventListener);
      html.classList.remove("custom-cursor-active");
      if (root) delete root.dataset.hover;
    };
  }, []);

  return (
    <div className="custom-cursor" aria-hidden="true" ref={rootRef}>
      {/* Horizontal line */}
      <div
        ref={hRef}
        className="custom-cursor-line fixed inset-x-0 top-0 h-px pointer-events-none z-[9995]"
        style={{ transform: OFFSCREEN }}
      />
      {/* Vertical line */}
      <div
        ref={vRef}
        className="custom-cursor-line fixed inset-y-0 left-0 w-px pointer-events-none z-[9995]"
        style={{ transform: OFFSCREEN }}
      />
      {/* Center dot */}
      <div
        ref={dotRef}
        className="custom-cursor-dot-wrap fixed top-0 left-0 w-1.5 h-1.5 pointer-events-none z-[9996]"
        style={{ transform: OFFSCREEN }}
      >
        <div className="custom-cursor-dot h-full w-full rounded-full" />
      </div>
    </div>
  );
}
