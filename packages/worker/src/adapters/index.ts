import { nswAdapter } from "./nsw";
import { qldAdapter } from "./qld";
import type { StateAdapter } from "./types";

/** All active adapters for Phase 1 */
export const adapters: readonly StateAdapter[] = [nswAdapter, qldAdapter];

export type { StateAdapter } from "./types";
