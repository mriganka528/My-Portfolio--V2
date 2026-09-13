"use client";
import { createContext, useContext } from "react";
import { MotionConfig } from "framer-motion";
import type { PortfolioData } from "@/lib/content-schema";
export type { PortfolioData, Profile, Skill, Project, Experience } from "@/lib/content-schema";

const PortfolioContext = createContext<PortfolioData | null>(null);
export function PortfolioProvider({ data, children }: { data: PortfolioData; children: React.ReactNode }) {
  return <PortfolioContext.Provider value={data}><MotionConfig reducedMotion="user">{children}</MotionConfig></PortfolioContext.Provider>;
}
export function usePortfolioData() {
  const data = useContext(PortfolioContext);
  if (!data) throw new Error("PortfolioProvider is required.");
  return { data };
}
