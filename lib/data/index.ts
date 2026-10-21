import { isDemoMode } from "@/lib/env";
import type { Repo } from "./repo";
import { demoRepo } from "./demo-repo";
import { supabaseRepo } from "./supabase-repo";

export function getRepo(): Repo {
  return isDemoMode() ? demoRepo : supabaseRepo;
}

export * from "./types";
export type { Repo, PickFilters, PickInput, Actor } from "./repo";
