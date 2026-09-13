"use client";
import { useState, useEffect, useId } from "react";
import type { PortfolioData, Skill, Project, Experience } from "@/lib/content-schema";
import { COLOR_OPTIONS, STATUS_OPTIONS, CATEGORY_OPTIONS as CAT_OPTIONS } from "@/lib/content-schema";
const inputCls = "w-full bg-transparent border px-3 py-2.5 font-code text-xs outline-none transition-colors focus:border-teal-400/40";
const inputStyle = { borderColor: "rgba(0,229,184,0.15)", color: "var(--text)", caretColor: "var(--teal)" };
const labelCls = "block font-code text-[9px] tracking-widest uppercase mb-1.5";
const labelStyle = { color: "var(--dim)" };

function ListField({ label, value, onChange, multiline = false }: { label: string; value: string[]; onChange: (value: string[]) => void; multiline?: boolean }) {
  const [input, setInput] = useState(value.join(multiline ? "\n" : ", "));
  const change = (next: string) => {
    setInput(next);
    onChange(next.split(multiline ? "\n" : ",").map(item => item.trim()).filter(Boolean));
  };
  return multiline ? <TextareaField label={label} value={input} onChange={change} /> : <Field label={label} value={input} onChange={change} />;
}

function MoveControls({ index, total, onMove }: { index: number; total: number; onMove: (direction: -1 | 1) => void }) {
  return <div className="flex gap-2 mb-2">
    <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="font-code text-[9px] px-2 py-1 border disabled:opacity-30" style={inputStyle}>↑</button>
    <button type="button" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)} className="font-code text-[9px] px-2 py-1 border disabled:opacity-30" style={inputStyle}>↓</button>
  </div>;
}

function moved<T>(items: T[], index: number, direction: -1 | 1) {
  const next = [...items];
  const destination = index + direction;
  if (destination >= 0 && destination < next.length) [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls} style={labelStyle}>{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={inputCls} style={inputStyle} />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls} style={labelStyle}>{label}</label>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className={`${inputCls} resize-none`} style={inputStyle} />
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="font-code text-[9px] tracking-widest uppercase" style={{ color: "var(--dim)" }}>{label}</label>
      <button type="button" role="switch" aria-label={label} aria-checked={value} onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full relative transition-colors"
        style={{ background: value ? "var(--teal)" : "rgba(255,255,255,0.1)" }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{ background: "#fff", left: value ? "calc(100% - 18px)" : "2px" }} />
      </button>
    </div>
  );
}

export function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 border font-code text-xs"
      style={{ background: "rgba(6,16,26,0.95)", borderColor: "rgba(0,229,184,0.3)", color: "var(--teal)", backdropFilter: "blur(8px)" }}>
      <span>✓</span> {msg}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border p-6" style={{ borderColor: "rgba(0,229,184,0.1)", background: "rgba(6,16,26,0.5)" }}>
      <h3 className="font-head font-bold text-base mb-5" style={{ color: "var(--teal)" }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Tab: Profile ──────────────────────────────────────────────────────────────

export function ProfileTab({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const p = data.profile;
  const set = (key: string, val: string | boolean) =>
    onChange({ ...data, profile: { ...p, [key]: val } });

  return (
    <div className="space-y-6">
      <SectionCard title="Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" value={p.firstName} onChange={v => set("firstName", v)} />
          <Field label="Last Name" value={p.lastName} onChange={v => set("lastName", v)} />
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Full Name" value={p.name} onChange={v => set("name", v)} />
          <Field label="Navigation initials / brand mark" value={p.brandMark} onChange={v => set("brandMark", v)} />
          <Field label="Title" value={p.title} onChange={v => set("title", v)} />
          <Field label="Subtitle / Tagline" value={p.subtitle} onChange={v => set("subtitle", v)} />
          <Field label="Location" value={p.location} onChange={v => set("location", v)} />
          <ToggleField label="Available for work" value={p.available} onChange={v => set("available", v)} />
        </div>
      </SectionCard>

      <SectionCard title="About cards">
        <div className="space-y-4">
          <Field label="Philosophy" value={p.philosophy} onChange={v => set("philosophy", v)} />
          <Field label="Approach" value={p.approach} onChange={v => set("approach", v)} />
          <Field label="Focus" value={p.focus} onChange={v => set("focus", v)} />
        </div>
      </SectionCard>

      <SectionCard title="Bio">
        <div className="space-y-4">
          <TextareaField label="Primary bio" value={p.bio} onChange={v => set("bio", v)} rows={3} />
          <TextareaField label="Secondary bio" value={p.bio2} onChange={v => set("bio2", v)} rows={3} />
        </div>
      </SectionCard>

      <SectionCard title="Contact & Social">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" value={p.email} onChange={v => set("email", v)} type="email" />
          <Field label="GitHub" value={p.github} onChange={v => set("github", v)} />
          <Field label="Twitter" value={p.twitter} onChange={v => set("twitter", v)} />
          <Field label="LinkedIn" value={p.linkedin} onChange={v => set("linkedin", v)} />
          <Field label="Cal.com" value={p.cal} onChange={v => set("cal", v)} />
        </div>
        <div className="space-y-4 mt-4">
          <TextareaField label="Contact introduction" value={p.contactIntro} onChange={v => set("contactIntro", v)} />
          <TextareaField label="Availability note" value={p.availabilityNote} onChange={v => set("availabilityNote", v)} rows={2} />
        </div>
      </SectionCard>

      <SectionCard title="Stats">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Years exp." value={p.yearsExp} onChange={v => set("yearsExp", v)} />
          <Field label="Projects shipped" value={p.projectsShipped} onChange={v => set("projectsShipped", v)} />
        </div>
      </SectionCard>
      <SectionCard title="Marquee & footer">
        <div className="space-y-4">
          <ListField label="Marquee items (one per line)" value={p.marqueeItems} onChange={value => onChange({ ...data, profile: { ...p, marqueeItems: value } })} multiline />
          <p className="font-code text-[9px]" style={labelStyle}>Leave the list empty to use your title, subtitle, and location.</p>
          <Field label="Footer note" value={p.footerNote} onChange={v => set("footerNote", v)} />
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Skills ───────────────────────────────────────────────────────────────


function SkillRow({ skill, onChange, onDelete }: { skill: Skill; onChange: (s: Skill) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!skill.name);
  return (
    <div className="border" style={{ borderColor: "rgba(0,229,184,0.1)" }}>
      <button type="button" aria-expanded={open} className="w-full text-left flex items-center gap-4 px-4 py-3" onClick={() => setOpen(o => !o)}>
        {skill.slug && <img key={skill.slug} src={`https://cdn.simpleicons.org/${skill.slug}/00e5b8`} alt="" className="w-5 h-5 object-contain opacity-70"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
        <span className="font-code text-xs flex-1" style={{ color: "var(--text)" }}>{skill.name || "Untitled skill"}</span>
        <span className="font-code text-[9px] px-2 py-0.5 border" style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }}>{skill.category}</span>
        <span className="font-code text-[9px]" style={{ color: "var(--teal)" }}>{skill.level}%</span>
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <Field label="Name" value={skill.name} onChange={v => onChange({ ...skill, name: v })} />
          <Field label="Icon slug (simpleicons)" value={skill.slug} onChange={v => onChange({ ...skill, slug: v })} />
          <div>
            <label className={labelCls} style={labelStyle}>Category</label>
            <select aria-label="Category" value={skill.category} onChange={e => onChange({ ...skill, category: e.target.value as Skill["category"] })}
              className={inputCls} style={{ ...inputStyle, background: "rgba(6,16,26,0.8)" }}>
              <option value="">Choose category</option>
              {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Level ({skill.level}%)</label>
            <input aria-label="Skill level" type="range" min={0} max={100} value={skill.level} onChange={e => onChange({ ...skill, level: +e.target.value })}
              className="w-full mt-2 accent-teal-400" />
          </div>
          <div className="col-span-2 sm:col-span-4 flex justify-end">
            <button onClick={onDelete} className="font-code text-[10px] px-3 py-1.5 border transition-colors"
              style={{ borderColor: "rgba(255,77,109,0.3)", color: "var(--coral)" }}>
              delete skill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SkillsTab({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => {
    const s: Skill = { id: crypto.randomUUID(), name: "", slug: "", category: "", level: 0 };
    onChange({ ...data, skills: [...data.skills, s] });
  };
  const update = (id: string, s: Skill) => onChange({ ...data, skills: data.skills.map(x => x.id === id ? s : x) });
  const del = (id: string) => onChange({ ...data, skills: data.skills.filter(x => x.id !== id) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="font-code text-xs" style={{ color: "var(--dim)" }}>{data.skills.length} skills · click any to expand</p>
        <button onClick={add} className="font-code text-[10px] px-4 py-2 border transition-colors hover:bg-teal-400/5"
          style={{ borderColor: "rgba(0,229,184,0.3)", color: "var(--teal)" }}>+ add skill</button>
      </div>
      <div className="space-y-2">
        {data.skills.map((s, index) => (
          <div key={s.id}>
            <MoveControls index={index} total={data.skills.length} onMove={direction => onChange({ ...data, skills: moved(data.skills, index, direction) })} />
            <SkillRow skill={s} onChange={ns => update(s.id, ns)} onDelete={() => del(s.id)} />
          </div>
        ))}
        {!data.skills.length && <p className="empty-state">No skills yet. Add your first skill to get started.</p>}
      </div>
      <p className="font-code text-[9px] pt-2" style={{ color: "var(--dim)" }}>
        Icon slugs from{" "}
        <a href="https://simpleicons.org" target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--teal)" }}>
          simpleicons.org
        </a>{" "}
        — hover any icon on that site to see its slug.
      </p>
    </div>
  );
}

// ── Tab: Projects ─────────────────────────────────────────────────────────────


function ProjectRow({ proj, onChange, onDelete }: { proj: Project; onChange: (p: Project) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!proj.name);
  return (
    <div className="border" style={{ borderColor: "rgba(0,229,184,0.1)" }}>
      <button type="button" aria-expanded={open} className="w-full text-left flex items-center gap-4 px-4 py-3" onClick={() => setOpen(o => !o)}>
        <span className="font-head font-bold text-sm w-8" style={{ color: "var(--dim)" }}>{proj.index}</span>
        <span className="font-code text-xs flex-1" style={{ color: "var(--text)" }}>{proj.name || "Untitled project"}</span>
        <span className="font-code text-[9px] px-2 py-0.5 border" style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }}>{proj.status}</span>
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Index" value={proj.index} onChange={v => onChange({ ...proj, index: v })} />
            <Field label="Name" value={proj.name} onChange={v => onChange({ ...proj, name: v })} />
            <Field label="Category" value={proj.category} onChange={v => onChange({ ...proj, category: v })} />
            <Field label="Stars" value={proj.stars} onChange={v => onChange({ ...proj, stars: v })} />
            <Field label="Year" value={proj.year} onChange={v => onChange({ ...proj, year: v })} />
            <div>
              <label className={labelCls} style={labelStyle}>Status</label>
              <select aria-label="Status" value={proj.status} onChange={e => onChange({ ...proj, status: e.target.value as Project["status"] })}
                className={inputCls} style={{ ...inputStyle, background: "rgba(6,16,26,0.8)" }}>
                <option value="">Choose status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <TextareaField label="Description" value={proj.description} onChange={v => onChange({ ...proj, description: v })} rows={3} />
          <ListField label="Tech stack (comma-separated)" value={proj.stack} onChange={stack => onChange({ ...proj, stack })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project URL" value={proj.url} onChange={url => onChange({ ...proj, url })} />
            <Field label="Source code URL" value={proj.sourceUrl} onChange={sourceUrl => onChange({ ...proj, sourceUrl })} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Accent color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.val} onClick={() => onChange({ ...proj, color: c.val })}
                  className="w-6 h-6 border-2 transition-all"
                  style={{ background: c.val, borderColor: proj.color === c.val ? "#fff" : "transparent" }}
                  aria-label={c.label} aria-pressed={proj.color === c.val} title={c.label} />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onDelete} className="font-code text-[10px] px-3 py-1.5 border"
              style={{ borderColor: "rgba(255,77,109,0.3)", color: "var(--coral)" }}>delete project</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectsTab({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => {
    const p: Project = { id: crypto.randomUUID(), index: "", name: "", category: "", description: "", stack: [], stars: "", year: "", status: "", color: "var(--teal)", url: "", sourceUrl: "" };
    onChange({ ...data, projects: [...data.projects, p] });
  };
  const update = (id: string, p: Project) => onChange({ ...data, projects: data.projects.map(x => x.id === id ? p : x) });
  const del = (id: string) => onChange({ ...data, projects: data.projects.filter(x => x.id !== id) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="font-code text-xs" style={{ color: "var(--dim)" }}>{data.projects.length} projects</p>
        <button onClick={add} className="font-code text-[10px] px-4 py-2 border transition-colors hover:bg-teal-400/5"
          style={{ borderColor: "rgba(0,229,184,0.3)", color: "var(--teal)" }}>+ add project</button>
      </div>
      {data.projects.map((p, index) => (
        <div key={p.id}>
          <MoveControls index={index} total={data.projects.length} onMove={direction => onChange({ ...data, projects: moved(data.projects, index, direction) })} />
          <ProjectRow proj={p} onChange={np => update(p.id, np)} onDelete={() => del(p.id)} />
        </div>
      ))}
      {!data.projects.length && <p className="empty-state">No projects yet. Add your first project to get started.</p>}
    </div>
  );
}

// ── Tab: Experience ───────────────────────────────────────────────────────────

export function ExperienceTab({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => {
    const e: Experience = { id: crypto.randomUUID(), company: "", role: "", period: "", note: "" };
    onChange({ ...data, experience: [...data.experience, e] });
  };
  const update = (id: string, e: Experience) => onChange({ ...data, experience: data.experience.map(x => x.id === id ? e : x) });
  const del = (id: string) => onChange({ ...data, experience: data.experience.filter(x => x.id !== id) });
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...data.experience];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...data, experience: arr });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="Visibility">
        <ToggleField label="Show experience section" value={data.profile.showExperience} onChange={value => onChange({ ...data, profile: { ...data.profile, showExperience: value } })} />
        <p className="font-code text-[10px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>Show or hide work history on your portfolio. Hidden entries stay saved and editable. Select save changes to publish this setting.</p>
      </SectionCard>
      <div className="flex items-center justify-between mb-4">
        <p className="font-code text-xs" style={{ color: "var(--dim)" }}>{data.experience.length} entries</p>
        <button onClick={add} className="font-code text-[10px] px-4 py-2 border transition-colors hover:bg-teal-400/5"
          style={{ borderColor: "rgba(0,229,184,0.3)", color: "var(--teal)" }}>+ add entry</button>
      </div>
      {data.experience.map((e, i) => (
        <div key={e.id} className="border" style={{ borderColor: "rgba(0,229,184,0.1)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-4">
            <Field label="Company" value={e.company} onChange={v => update(e.id, { ...e, company: v })} />
            <Field label="Role" value={e.role} onChange={v => update(e.id, { ...e, role: v })} />
            <Field label="Period" value={e.period} onChange={v => update(e.id, { ...e, period: v })} />
            <Field label="Note" value={e.note} onChange={v => update(e.id, { ...e, note: v })} />
          </div>
          <div className="border-t px-4 py-2 flex items-center justify-between" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
            <div className="flex gap-2">
              <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="font-code text-[9px] px-2 py-1 border disabled:opacity-30" style={{ borderColor: "rgba(0,229,184,0.15)", color: "var(--dim)" }}>↑</button>
              <button aria-label="Move down" disabled={i === data.experience.length - 1} onClick={() => move(i, 1)} className="font-code text-[9px] px-2 py-1 border disabled:opacity-30" style={{ borderColor: "rgba(0,229,184,0.15)", color: "var(--dim)" }}>↓</button>
            </div>
            <button onClick={() => del(e.id)} className="font-code text-[10px] px-3 py-1 border"
              style={{ borderColor: "rgba(255,77,109,0.3)", color: "var(--coral)" }}>delete</button>
          </div>
        </div>
      ))}
      {!data.experience.length && <p className="empty-state">No work history yet. Add an entry to get started.</p>}
    </div>
  );
}

// ── Admin shell ────────────────────────────────────────────────────────────────
