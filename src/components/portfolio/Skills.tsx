"use client";
import type { CSSProperties } from "react";
import { usePortfolioData, type Skill } from "./provider";
import { accentColor } from "@/lib/links";
import Reveal from "./Reveal";

const CAT_COLORS: Record<string, string> = {
  Language: "var(--teal)",
  Frontend:  "#00d4ff",
  Backend:   "var(--violet)",
  DevOps:    "#f5c400",
  Cloud:     "#ff9900",
  Database:  "var(--coral)",
  Infra:     "#b060ff",
  Tool:      "#7a9ab5",
};

function SkillCard({ skill }: { skill: Skill }) {
  const col = accentColor(CAT_COLORS[skill.category] ?? "var(--teal)");
  const iconUrl = `https://cdn.simpleicons.org/${skill.slug}/ffffff`;

  return (
    <div
      className="skill-card border flex flex-col items-center gap-3 p-4"
      style={{ "--skill-border": `${col}50`, "--skill-background": `${col}08` } as CSSProperties}
    >
      {/* Logo */}
      <div className="w-9 h-9 flex items-center justify-center">
        {skill.slug && <img
          src={iconUrl}
          alt={skill.name}
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          className="w-8 h-8 object-contain"
          onError={(e) => {
            // Fallback: show initials if icon fails to load
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />}
        {/* Fallback initials */}
        <span
          className={`${skill.slug ? "hidden" : "flex"} w-8 h-8 items-center justify-center font-head font-bold text-sm`}
          style={{ color: col }}
        >
          {skill.name.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Name */}
      <span className="font-code text-xs text-center leading-snug break-words max-w-full" style={{ color: "#8892b0" }}>
        {skill.name}
      </span>

      {/* Level bar */}
      <div className="w-full">
        <div className="flex flex-wrap justify-between gap-1 mb-1">
          <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>
            {skill.category}
          </span>
          <span className="font-code text-[10px]" style={{ color: col }}>
            {skill.level}%
          </span>
        </div>
        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full origin-left"
            style={{ transform: `scaleX(${skill.level / 100})`, background: col }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Skills() {
  const { data } = usePortfolioData();

  const categories = [...new Set(data.skills.map((s) => s.category).filter(Boolean))];

  return (
    <section id="skills" className="portfolio-section py-28 px-8 md:px-20 border-t relative" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(124,63,255,0.04) 0%, transparent 70%)" }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="font-code text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--teal)" }}>
              {"// 02 · capabilities"}
            </p>
            <h2 className="font-head font-bold leading-none" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>SKILLS</h2>
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 font-code text-[9px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[cat] ?? "var(--teal)" }} />
                <span style={{ color: "var(--dim)" }}>{cat}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Skill grid */}
        <Reveal><div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-10 sm:mb-16">
          {data.skills.map(skill => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div></Reveal>

        {!data.skills.length && <p className="empty-state">No skills published yet.</p>}

        {/* Experience timeline */}
        {data.profile.showExperience && <Reveal><div className="border-t pt-12" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <p className="font-code text-[9px] tracking-widest uppercase mb-8" style={{ color: "var(--dim)" }}>
            work history
          </p>
          {data.experience.map(e => (
            <div
              key={e.id}
              className="experience-row grid grid-cols-[100px_1fr_auto] gap-6 py-5 border-b -mx-4 px-4 transition-colors hover:bg-teal-400/[0.02]"
              style={{ borderColor: "rgba(0,229,184,0.07)" }}
            >
              <span className="font-code text-[10px] pt-0.5" style={{ color: "var(--dim)" }}>{e.period}</span>
              <div>
                <div className="text-sm font-medium mb-0.5">{e.role}</div>
                <div className="font-code text-[10px]" style={{ color: "var(--dim)" }}>{e.note}</div>
              </div>
              <div className="font-head font-bold text-right self-center" style={{ color: "var(--teal)", fontSize: "0.95rem" }}>
                {e.company}
              </div>
            </div>
          ))}
          {!data.experience.length && <p className="empty-state">No work history published yet.</p>}
        </div></Reveal>}
      </div>
    </section>
  );
}
