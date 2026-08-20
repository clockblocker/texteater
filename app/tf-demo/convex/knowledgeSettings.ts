import { v } from "convex/values";
import {
	DEFAULT_KNOWLEDGE_SETTINGS,
	type KnowledgeSettings,
} from "dumrel/settings";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { knowledgeSettingsValidator } from "./model/validators";

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}

export function defaultKnowledgeSettings(): KnowledgeSettings {
	return structuredClone(DEFAULT_KNOWLEDGE_SETTINGS);
}

export async function loadKnowledgeSettings(
	ctx: QueryCtx | MutationCtx,
	visitorId: string,
): Promise<KnowledgeSettings> {
	assertVisitorId(visitorId);
	const stored = await ctx.db
		.query("knowledgeSettings")
		.withIndex("by_visitor_id", (q) => q.eq("visitorId", visitorId))
		.unique();
	return stored ? stored.settings : defaultKnowledgeSettings();
}

export const get = query({
	args: { visitorId: v.string() },
	returns: knowledgeSettingsValidator,
	handler: (ctx, { visitorId }) => loadKnowledgeSettings(ctx, visitorId),
});

export const update = mutation({
	args: { visitorId: v.string(), settings: knowledgeSettingsValidator },
	returns: knowledgeSettingsValidator,
	handler: async (ctx, { visitorId, settings }) => {
		assertVisitorId(visitorId);
		const parsed = settings;
		const existing = await ctx.db
			.query("knowledgeSettings")
			.withIndex("by_visitor_id", (q) => q.eq("visitorId", visitorId))
			.unique();
		const value = { visitorId, settings: parsed, updatedAt: Date.now() };
		if (existing) await ctx.db.replace(existing._id, value);
		else await ctx.db.insert("knowledgeSettings", value);
		return parsed;
	},
});
