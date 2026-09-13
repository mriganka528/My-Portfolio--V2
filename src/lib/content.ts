import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import { emptyPortfolio, portfolioSchema, type PortfolioData } from "./content-schema";

export class ContentConflictError extends Error {}

export const readPortfolio = cache(async (): Promise<PortfolioData> => {
  if (!process.env.DATABASE_URL?.trim()) return emptyPortfolio();
  const row = await getDb().profile.findUnique({
    where: { id: "main" },
    include: {
      skills: { orderBy: { sortOrder: "asc" } },
      projects: { orderBy: { sortOrder: "asc" } },
      experience: { orderBy: { sortOrder: "asc" } }
    }
  });
  if (!row) return emptyPortfolio();
  return portfolioSchema.parse({ version: row.version, profile: row, skills: row.skills, projects: row.projects, experience: row.experience });
});

export async function writePortfolio(data: PortfolioData) {
  const db = getDb();
  return db.$transaction(async tx => {
    // Establish the singleton without overwriting published content.
    await tx.profile.upsert({ where: { id: "main" }, create: { id: "main" }, update: {} });
    const updated = await tx.profile.updateMany({
      where: { id: "main", version: data.version },
      data: { ...data.profile, version: { increment: 1 } }
    });
    if (!updated.count) throw new ContentConflictError("Content changed in another tab. Reload before saving.");
    await tx.skill.deleteMany({ where: { profileId: "main" } });
    await tx.project.deleteMany({ where: { profileId: "main" } });
    await tx.experience.deleteMany({ where: { profileId: "main" } });
    if (data.skills.length) await tx.skill.createMany({ data: data.skills.map((item, sortOrder) => ({ ...item, sortOrder, profileId: "main" })) });
    if (data.projects.length) await tx.project.createMany({ data: data.projects.map((item, sortOrder) => ({ ...item, sortOrder, profileId: "main" })) });
    if (data.experience.length) await tx.experience.createMany({ data: data.experience.map((item, sortOrder) => ({ ...item, sortOrder, profileId: "main" })) });
    return { ...data, version: data.version + 1 };
  });
}
