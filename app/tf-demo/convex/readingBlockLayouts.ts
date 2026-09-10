import { v } from "convex/values";

import {
	assertReadingBlockOrder,
	assertReadingBlockSupported,
	DEFAULT_DE_READING_LANGUAGE_LAYOUT,
	type ReadingBlockKind,
	type ReadingBlockRoute,
	reconcileReadingBlockLayout,
	type SerializedReadingBlockLayout,
} from "../shared/reading-block-layout";
import type { SupportedTargetLanguage } from "../shared/supported-target-language";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
	readingBlockKindValidator,
	readingBlockLayoutValidator,
	readingBlockRouteValidator,
} from "./model/validators";

type LayoutCtx = QueryCtx | MutationCtx;
const MAX_FAMILY_KIND_LAYOUTS_PER_LANGUAGE = 128;

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}

function availableLanguageBlocks(
	_targetLanguage: SupportedTargetLanguage,
): readonly ReadingBlockKind[] {
	return DEFAULT_DE_READING_LANGUAGE_LAYOUT.order;
}

function cloneLayout(layout: SerializedReadingBlockLayout): {
	order: ReadingBlockKind[];
	hidden: ReadingBlockKind[];
} {
	return { order: [...layout.order], hidden: [...layout.hidden] };
}

function defaultLanguageLayout(
	targetLanguage: SupportedTargetLanguage,
): SerializedReadingBlockLayout {
	return reconcileReadingBlockLayout(
		DEFAULT_DE_READING_LANGUAGE_LAYOUT,
		availableLanguageBlocks(targetLanguage),
	);
}

function setBlockVisibility(
	layout: SerializedReadingBlockLayout,
	blockKind: ReadingBlockKind,
	visible: boolean,
): SerializedReadingBlockLayout {
	const hidden = visible
		? layout.hidden.filter((candidate) => candidate !== blockKind)
		: layout.hidden.includes(blockKind)
			? [...layout.hidden]
			: [...layout.hidden, blockKind];
	return { order: [...layout.order], hidden };
}

async function findLanguageLayout(
	ctx: LayoutCtx,
	visitorId: string,
	targetLanguage: SupportedTargetLanguage,
) {
	return await ctx.db
		.query("readingLanguageLayouts")
		.withIndex("by_visitor_id_and_target_language", (q) =>
			q.eq("visitorId", visitorId).eq("targetLanguage", targetLanguage),
		)
		.unique();
}

async function loadLanguageLayout(
	ctx: LayoutCtx,
	visitorId: string,
	targetLanguage: SupportedTargetLanguage,
): Promise<SerializedReadingBlockLayout> {
	const stored = await findLanguageLayout(ctx, visitorId, targetLanguage);
	return stored
		? reconcileReadingBlockLayout(
				stored,
				availableLanguageBlocks(targetLanguage),
			)
		: defaultLanguageLayout(targetLanguage);
}

async function findFamilyKindLayout(
	ctx: LayoutCtx,
	visitorId: string,
	route: ReadingBlockRoute,
) {
	return await ctx.db
		.query("readingFamilyKindLayouts")
		.withIndex(
			"by_visitor_id_and_target_language_and_family_and_kind",
			(q) =>
				q
					.eq("visitorId", visitorId)
					.eq("targetLanguage", route.targetLanguage)
					.eq("family", route.family)
					.eq("kind", route.kind),
		)
		.unique();
}

async function loadFamilyKindLayout(
	ctx: LayoutCtx,
	visitorId: string,
	route: ReadingBlockRoute,
): Promise<SerializedReadingBlockLayout> {
	const stored = await findFamilyKindLayout(ctx, visitorId, route);
	return stored
		? reconcileReadingBlockLayout(stored, stored.order)
		: loadLanguageLayout(ctx, visitorId, route.targetLanguage);
}

async function loadFamilyKindLayoutForMutation(
	ctx: MutationCtx,
	visitorId: string,
	route: ReadingBlockRoute,
): Promise<SerializedReadingBlockLayout> {
	const stored = await findFamilyKindLayout(ctx, visitorId, route);
	return stored
		? reconcileReadingBlockLayout(stored, stored.order)
		: loadLanguageLayout(ctx, visitorId, route.targetLanguage);
}

async function loadStoredFamilyKindLayouts(
	ctx: MutationCtx,
	visitorId: string,
	targetLanguage: SupportedTargetLanguage,
) {
	const layouts = await ctx.db
		.query("readingFamilyKindLayouts")
		.withIndex(
			"by_visitor_id_and_target_language_and_family_and_kind",
			(q) =>
				q
					.eq("visitorId", visitorId)
					.eq("targetLanguage", targetLanguage),
		)
		.take(MAX_FAMILY_KIND_LAYOUTS_PER_LANGUAGE + 1);
	if (layouts.length > MAX_FAMILY_KIND_LAYOUTS_PER_LANGUAGE) {
		throw new Error(
			`A Visitor may keep at most ${MAX_FAMILY_KIND_LAYOUTS_PER_LANGUAGE} Reading layouts per language.`,
		);
	}
	return layouts;
}

async function storeLanguageLayout(
	ctx: MutationCtx,
	visitorId: string,
	targetLanguage: SupportedTargetLanguage,
	layout: SerializedReadingBlockLayout,
	updatedAt: number,
): Promise<void> {
	const existing = await findLanguageLayout(ctx, visitorId, targetLanguage);
	const value = {
		visitorId,
		targetLanguage,
		order: [...layout.order],
		hidden: [...layout.hidden],
		updatedAt,
	};
	if (existing) await ctx.db.replace(existing._id, value);
	else await ctx.db.insert("readingLanguageLayouts", value);
}

async function storeFamilyKindLayout(
	ctx: MutationCtx,
	visitorId: string,
	route: ReadingBlockRoute,
	layout: SerializedReadingBlockLayout,
	updatedAt: number,
): Promise<void> {
	const existing = await findFamilyKindLayout(ctx, visitorId, route);
	const value = {
		visitorId,
		targetLanguage: route.targetLanguage,
		family: route.family,
		kind: route.kind,
		order: [...layout.order],
		hidden: [...layout.hidden],
		updatedAt,
	};
	if (existing) await ctx.db.replace(existing._id, value);
	else await ctx.db.insert("readingFamilyKindLayouts", value);
}

export const getLanguage = query({
	args: { visitorId: v.string(), targetLanguage: v.literal("de") },
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, targetLanguage }) => {
		assertVisitorId(visitorId);
		return cloneLayout(
			await loadLanguageLayout(ctx, visitorId, targetLanguage),
		);
	},
});

export const getFamilyKind = query({
	args: { visitorId: v.string(), route: readingBlockRouteValidator },
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, route }) => {
		assertVisitorId(visitorId);
		const layout = await loadFamilyKindLayout(ctx, visitorId, route);
		return cloneLayout(layout);
	},
});

export const setLanguageBlockOrder = mutation({
	args: {
		visitorId: v.string(),
		targetLanguage: v.literal("de"),
		order: v.array(readingBlockKindValidator),
	},
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, targetLanguage, order }) => {
		assertVisitorId(visitorId);
		assertReadingBlockOrder(order);
		const currentLanguage = await loadLanguageLayout(
			ctx,
			visitorId,
			targetLanguage,
		);
		const nextLanguage = {
			order: [...order],
			hidden: [...currentLanguage.hidden],
		};
		const updatedAt = Date.now();
		await storeLanguageLayout(
			ctx,
			visitorId,
			targetLanguage,
			nextLanguage,
			updatedAt,
		);
		for (const current of await loadStoredFamilyKindLayouts(
			ctx,
			visitorId,
			targetLanguage,
		)) {
			await ctx.db.patch(current._id, {
				order: [...nextLanguage.order],
				updatedAt,
			});
		}
		return cloneLayout(nextLanguage);
	},
});

export const setLanguageBlockVisibility = mutation({
	args: {
		visitorId: v.string(),
		targetLanguage: v.literal("de"),
		blockKind: readingBlockKindValidator,
		visible: v.boolean(),
	},
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, targetLanguage, blockKind, visible }) => {
		assertVisitorId(visitorId);
		const available = availableLanguageBlocks(targetLanguage);
		assertReadingBlockSupported(blockKind, available);
		const currentLanguage = await loadLanguageLayout(
			ctx,
			visitorId,
			targetLanguage,
		);
		const nextLanguage = setBlockVisibility(
			currentLanguage,
			blockKind,
			visible,
		);
		const updatedAt = Date.now();
		await storeLanguageLayout(
			ctx,
			visitorId,
			targetLanguage,
			nextLanguage,
			updatedAt,
		);
		for (const current of await loadStoredFamilyKindLayouts(
			ctx,
			visitorId,
			targetLanguage,
		)) {
			const nextRoute = setBlockVisibility(current, blockKind, visible);
			await ctx.db.patch(current._id, {
				hidden: [...nextRoute.hidden],
				updatedAt,
			});
		}
		return cloneLayout(nextLanguage);
	},
});

export const setFamilyKindBlockOrder = mutation({
	args: {
		visitorId: v.string(),
		route: readingBlockRouteValidator,
		order: v.array(readingBlockKindValidator),
	},
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, route, order }) => {
		assertVisitorId(visitorId);
		assertReadingBlockOrder(order);
		const current = await loadFamilyKindLayoutForMutation(
			ctx,
			visitorId,
			route,
		);
		const next = { order: [...order], hidden: [...current.hidden] };
		await storeFamilyKindLayout(ctx, visitorId, route, next, Date.now());
		return cloneLayout(next);
	},
});

export const setFamilyKindBlockVisibility = mutation({
	args: {
		visitorId: v.string(),
		route: readingBlockRouteValidator,
		blockKind: readingBlockKindValidator,
		visible: v.boolean(),
	},
	returns: readingBlockLayoutValidator,
	handler: async (ctx, { visitorId, route, blockKind, visible }) => {
		assertVisitorId(visitorId);
		assertReadingBlockSupported(blockKind);
		const current = await loadFamilyKindLayoutForMutation(
			ctx,
			visitorId,
			route,
		);
		const next = setBlockVisibility(current, blockKind, visible);
		await storeFamilyKindLayout(ctx, visitorId, route, next, Date.now());
		return cloneLayout(next);
	},
});
