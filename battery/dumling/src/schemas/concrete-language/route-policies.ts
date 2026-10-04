import type { Language } from "../../generated/units.js";
import { deRoutePolicy } from "./de/route-policy.js";
import { enRoutePolicy } from "./en/route-policy.js";
import { heRoutePolicy } from "./he/route-policy.js";

/** Each language's route policy, by language; every language has one. */
export const routePolicies = {
	de: deRoutePolicy,
	en: enRoutePolicy,
	he: heRoutePolicy,
} as const satisfies { [L in Language]: { language: L } };
