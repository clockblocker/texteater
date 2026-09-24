import { v } from "convex/values";
import type { KnowledgePreferences } from "../shared/knowledge-preferences";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { knowledgeSettingsValidator } from "./model/validators";
import {
	loadRelationPublicationAuthorization,
	publicationAuthorizationValidator,
} from "./relationPublication";

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}

export function defaultKnowledgeSettings(): KnowledgePreferences {
	return cloneKnowledgeSettings(DEFAULT_KNOWLEDGE_SETTINGS);
}

function cloneKnowledgeSettings(
	settings: KnowledgePreferences,
): KnowledgePreferences {
	return structuredClone(settings);
}

export async function loadKnowledgeSettings(
	ctx: QueryCtx | MutationCtx,
	visitorId: string,
): Promise<KnowledgePreferences> {
	assertVisitorId(visitorId);
	const stored = await ctx.db
		.query("knowledgeSettings")
		.withIndex("by_visitor_id", (q) => q.eq("visitorId", visitorId))
		.unique();
	return stored
		? cloneKnowledgeSettings(stored.settings)
		: defaultKnowledgeSettings();
}

export const get = query({
	args: { visitorId: v.string() },
	returns: knowledgeSettingsValidator,
	handler: (ctx, { visitorId }) => loadKnowledgeSettings(ctx, visitorId),
});

/**
 * What an action needs to draft Knowledge for one Visitor: their settings and
 * the relation-publication authorization, read as one snapshot in one hop.
 */
export const getDraftContext = internalQuery({
	args: { visitorId: v.string() },
	returns: v.object({
		settings: knowledgeSettingsValidator,
		authorization: publicationAuthorizationValidator,
	}),
	handler: async (ctx, { visitorId }) => ({
		settings: await loadKnowledgeSettings(ctx, visitorId),
		authorization: await loadRelationPublicationAuthorization(ctx),
	}),
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
		return cloneKnowledgeSettings(parsed);
	},
});
