"use client";
import { useState } from "react";
import { usePortfolioData } from "./provider";
import { externalUrl, accentColor } from "@/lib/links";

export default function Projects() {
  const { data } = usePortfolioData();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="projects" className="portfolio-section py-28 px-8 md:px-20 border-t relative" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-code text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--teal)" }}>{"// 03 · selected work"}</p>
            <h2 className="font-head font-bold leading-none" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>PROJECTS</h2>
          </div>
          <div className="hidden md:block text-right">
            <span className="font-code text-xs" style={{ color: "var(--dim)" }}>{data.projects.length} featured</span>
          </div>
        </div>

        <div>
          {data.projects.map((p) => {
            const isOpen = open === p.id;
            const col = accentColor(p.color);
            return (
              <div key={p.id} className="proj-row" data-hover>
                <button type="button" aria-expanded={isOpen} aria-controls={`project-${p.id}`} onClick={() => setOpen(isOpen ? null : p.id)} className="project-heading w-[calc(100%+2rem)] text-left flex items-center gap-6 py-5 -mx-4 px-4">
                  <span
                    className="font-head font-bold shrink-0 w-14 text-right transition-colors duration-200"
                    style={{ fontSize: "clamp(1.6rem,3vw,2.8rem)", color: isOpen ? col : "rgba(255,255,255,0.06)" }}
                  >
                    {p.index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-4">
                      <span className="project-name font-head font-bold transition-colors duration-200"
                        style={{ fontSize: "clamp(1.1rem,2.5vw,1.6rem)", color: isOpen ? col : "var(--text)" }}>
                        {p.name}
                      </span>
                      <span className="font-code text-[10px] tracking-widest uppercase hidden sm:inline" style={{ color: "var(--dim)" }}>
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="project-meta flex items-center gap-6 shrink-0">
                    {p.stars && <span className="font-code text-[10px] hidden md:inline" style={{ color: col, opacity: 0.8 }}>★ {p.stars}</span>}
                    {p.status && <span className="font-code text-[10px] tracking-widest uppercase hidden md:inline px-2 py-0.5 border"
                      style={{ color: col, borderColor: `${col}30`, background: `${col}10` }}>
                      {p.status}
                    </span>}
                    <span className="project-year font-code text-[10px]" style={{ color: "var(--dim)" }}>{p.year}</span>
                    <span className="font-code text-xs transition-transform duration-200 inline-block"
                      style={{ color: col, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>↓</span>
                  </div>
                </button>

                <div id={`project-${p.id}`} inert={!isOpen} aria-hidden={!isOpen} className="project-panel">
                  <div className="min-h-0 overflow-hidden">
                  <div className="project-details pb-8 pl-20 pr-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed mb-5" style={{ color: "#7a9ab5", fontWeight: 300 }}>{p.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {p.stack.map((t, i) => (
                          <span key={`${t}-${i}`} className="max-w-full break-words font-code text-[10px] px-2.5 py-1 border"
                            style={{ borderColor: `${col}30`, color: col, background: `${col}08` }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                    {externalUrl(p.url) && <a href={externalUrl(p.url)} target="_blank" rel="noopener noreferrer" className="font-code text-xs shrink-0 inline-flex items-center gap-2 group" style={{ color: col }} data-hover>
                      view project <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </a>}
                    {externalUrl(p.sourceUrl) && <a href={externalUrl(p.sourceUrl)} target="_blank" rel="noopener noreferrer" className="font-code text-xs" style={{ color: col }}>source code ↗</a>}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!data.projects.length && <p className="empty-state">No projects published yet.</p>}

        <div className="flex flex-wrap gap-4 items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <span className="font-code text-xs" style={{ color: "var(--dim)" }}>click any row to expand</span>
          {externalUrl(data.profile.github) && <a href={externalUrl(data.profile.github)} target="_blank" rel="noopener noreferrer" className="max-w-full break-all font-code text-xs hover:underline" style={{ color: "var(--teal)" }}>
            {data.profile.github} →
          </a>}
        </div>
      </div>
    </section>
  );
}
