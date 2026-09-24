import { v } from "convex/values";
import { env, query } from "./_generated/server";

/**
 * Deployment env flags, declared in convex.config.ts, that open anonymous
 * entry points. Local dev sets both (tooling/sync-convex-env.sh); a hosted
 * deployment leaves them unset.
 */

/** Global wipes run only where `TF_DEMO_ADMIN=1`. */
export function adminEnabled(): boolean {
	return env.TF_DEMO_ADMIN === "1";
}

/** Inspection capture is honoured only where `TF_INSPECTION=1`. */
export function inspectionEnabled(): boolean {
	return env.TF_INSPECTION === "1";
}

export function requireAdmin(): void {
	if (!adminEnabled())
		throw new Error("Global wipes are disabled on this deployment.");
}

export const get = query({
	args: {},
	returns: v.object({ admin: v.boolean(), inspection: v.boolean() }),
	handler: () => ({ admin: adminEnabled(), inspection: inspectionEnabled() }),
});
