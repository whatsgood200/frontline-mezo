import { env } from "@/lib/env";
import { chainAdapter } from "./chain";
import { mockAdapter } from "./mock";
import type { FrontlineAdapter } from "./types";

// The only place the app picks an adapter. env.ts already refuses mock in production.
export const frontline: FrontlineAdapter = env.adapter === "mock" ? mockAdapter : chainAdapter;

export * from "./types";
