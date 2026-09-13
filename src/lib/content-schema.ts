import { z } from "zod";

const text = (max = 200) => z.string().trim().max(max);
const link = text(2048).refine(value => {
  if (!value) return true;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}, "Enter a valid HTTP or HTTPS link.");
const email = z.union([z.literal(""), z.email().max(254)]);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, "Invalid item ID.");

export const CATEGORY_OPTIONS = ["Language", "Frontend", "Backend", "DevOps", "Cloud", "Database", "Infra", "Tool"] as const;
export const STATUS_OPTIONS = ["production", "open source", "beta"] as const;
export const COLOR_OPTIONS = [
  { label: "Teal", val: "var(--teal)" },
  { label: "Cyan", val: "#00d4ff" },
  { label: "Violet", val: "var(--violet)" },
  { label: "Coral", val: "var(--coral)" },
  { label: "Lime", val: "var(--lime)" }
] as const;

export const profileSchema = z.object({
  name: text(), firstName: text(100), lastName: text(100), brandMark: text(12),
  title: text(), subtitle: text(500), bio: text(5000), bio2: text(5000),
  location: text(), available: z.boolean(), email,
  github: link, twitter: z.union([z.string().regex(/^@[\w]{1,30}$/), link]),
  linkedin: link, cal: link, yearsExp: text(30), projectsShipped: text(30),
  showExperience: z.boolean().default(true), marqueeItems: z.array(text()).max(30),
  philosophy: text(500), approach: text(500), focus: text(500),
  contactIntro: text(5000), availabilityNote: text(1000), footerNote: text(500)
});
export const skillSchema = z.object({
  id, name: text(100).min(1, "A skill needs a name."),
  slug: text(100).regex(/^[a-z0-9-]*$/, "Use a Simple Icons slug (lowercase letters, digits, or hyphens)."),
  category: z.enum(["", ...CATEGORY_OPTIONS]), level: z.number().int().min(0).max(100)
});
export const projectSchema = z.object({
  id, index: text(12), name: text(200).min(1, "A project needs a name."), category: text(),
  description: text(10000), stack: z.array(text(100).min(1)).max(40),
  stars: text(30), year: text(30), status: z.enum(["", ...STATUS_OPTIONS]),
  color: z.string().refine(value => COLOR_OPTIONS.some(color => color.val === value), "Choose an accent color."),
  url: link, sourceUrl: link
});
export const experienceSchema = z.object({
  id, company: text().min(1, "An experience entry needs a company."),
  role: text(), period: text(100), note: text(2000)
});

export const portfolioSchema = z.object({
  version: z.number().int().min(0), profile: profileSchema,
  skills: z.array(skillSchema).max(200), projects: z.array(projectSchema).max(100),
  experience: z.array(experienceSchema).max(100)
}).superRefine((data, context) => {
  for (const key of ["skills", "projects", "experience"] as const) {
    const ids = data[key].map(item => item.id);
    if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: [key], message: "Each item must have a unique ID." });
  }
});

export type Profile = z.infer<typeof profileSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type PortfolioData = z.infer<typeof portfolioSchema>;

// Empty form values, never sample portfolio content or database seed data.
export function emptyPortfolio(): PortfolioData {
  return {
    version: 0,
    profile: {
      name: "", firstName: "", lastName: "", brandMark: "", title: "", subtitle: "", bio: "", bio2: "",
      location: "", available: false, email: "", github: "", twitter: "", linkedin: "", cal: "",
      yearsExp: "", projectsShipped: "", showExperience: true, marqueeItems: [],
      philosophy: "", approach: "", focus: "", contactIntro: "", availabilityNote: "", footerNote: ""
    },
    skills: [], projects: [], experience: []
  };
}

export const contactSchema = z.object({
  name: text(120).min(1, "Enter your name."),
  email: z.email().max(254).transform(value => value.toLowerCase()),
  message: text(5000).min(10, "Please write at least 10 characters."),
  website: z.string().max(300).optional().default("")
});

export const loginSchema = z.object({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false)
});
