"use client";
import { useEffect, useRef } from "react";

export default function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    let observer: IntersectionObserver | undefined;
    const update = () => {
      observer?.disconnect();
      delete element.dataset.reveal;
      if (!media.matches || element.getBoundingClientRect().top < window.innerHeight) return;
      element.dataset.reveal = "pending";
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "visible";
        observer?.disconnect();
      }, { rootMargin: "0px 0px 80px 0px", threshold: 0 });
      observer.observe(element);
    };
    update();
    media.addEventListener("change", update);
    return () => { observer?.disconnect(); media.removeEventListener("change", update); };
  }, []);
  return <div ref={ref} className="section-reveal">{children}</div>;
}
