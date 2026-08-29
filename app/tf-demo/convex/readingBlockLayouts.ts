import { v } from "convex/values";

import {
	assertReadingBlockOrder,
	assertReadingBlockSupported,
	availableReadingBlocksForRoute,
	DEFAULT_DE_READING_LANGUAGE_LAYOUT,
	defaultReadingBlockLayoutForRoute,
	projectReadingLanguageLayoutOntoRoute,
	type ReadingBlockKind,
	type ReadingBlockRoute,
	reconcileReadingBlockLayout,
	type SerializedReadingBlockLayout,
	supportedReadingRoutes,
} from "../shared/reading-block-layout";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
	readingBlockKindValidator,
	readingBlockLayoutValidator,
	readingBlockRouteValidator,
} from "./model/validators";

type LayoutCtx = QueryCtx | MutationCtx;
type TargetLanguage = ReadingBlockRoute["targetLanguage"];

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}

function availableLanguageBlocks(
	targetLanguage: TargetLanguage,
): readonly ReadingBlockKind[] {
	const seen = new Set<ReadingBlockKind>();
	const available: ReadingBlockKind[] = [];
	for (const route of supportedReadingRoutes(targetLanguage)) {
		for (const blockKind of availableReadingBlocksForRoute(route) ?? []) {
			if (seen.has(blockKind)) continue;
			seen.add(blockKind);
			available.push(blockKind);
		}
	}
	return reconcileReadingBlockLayout(
		DEFAULT_DE_READING_LANGUAGE_LAYOUT,
		available,
	).order;
}

function cloneLayout(layout: SerializedReadingBlockLayout): {
	order: ReadingBlockKind[];
	hidden: ReadingBlockKind[];
} {
	return { order: [...layout.order], hidden: [...layout.hidden] };
}

function defaultLanguageLayout(
	targetLanguage: TargetLanguage,
): SerializedReadingBlockLayout {
	return reconcileReadingBlockLayout(
		DEFAULT_DE_READING_LANGUAGE_LAYOUT,
		availableLanguageBlocks(targetLanguage),
	);
}

function assertSupportedRoute(
	route: ReadingBlockRoute,
): readonly ReadingBlockKind[] {
	const available = availableReadingBlocksForRoute(route);
	if (!available) {
		throw new Error(
			`Unsupported Reading route: ${route.targetLanguage}/${route.family}/${route.kind}.`,
		);
	}
	return available;
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
	targetLanguage: TargetLanguage,
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
	targetLanguage: TargetLanguage,
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
): Promise<SerializedReadingBlockLayout | null> {
	const available = assertSupportedRoute(route);
	const stored = await findFamilyKindLayout(ctx, visitorId, route);
	return stored
		? reconcileReadingBlockLayout(stored, available)
		: defaultReadingBlockLayoutForRoute(route);
}

async function loadFamilyKindLayoutForMutation(
	ctx: MutationCtx,
	visitorId: string,
	route: ReadingBlockRoute,
): Promise<SerializedReadingBlockLayout> {
	const available = assertSupportedRoute(route);
	const stored = await findFamilyKindLayout(ctx, visitorId, route);
	if (stored) return reconcileReadingBlockLayout(stored, available);
	const languageLayout = await loadLanguageLayout(
		ctx,
		visitorId,
		route.targetLanguage,
	);
	return projectReadingLanguageLayoutOntoRoute(languageLayout, route);
}

async function storeLanguageLayout(
	ctx: MutationCtx,
	visitorId: string,
	targetLanguage: TargetLanguage,
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
		if (!layout)
			throw new Error("Supported Reading route has no default layout.");
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
		const available = availableLanguageBlocks(targetLanguage);
		assertReadingBlockOrder(order, available);
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
		for (const route of supportedReadingRoutes(targetLanguage)) {
			const currentRoute = await loadFamilyKindLayoutForMutation(
				ctx,
				visitorId,
				route,
			);
			const projected = projectReadingLanguageLayoutOntoRoute(
				nextLanguage,
				route,
			);
			await storeFamilyKindLayout(
				ctx,
				visitorId,
				route,
				{ order: projected.order, hidden: currentRoute.hidden },
				updatedAt,
			);
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
		for (const route of supportedReadingRoutes(targetLanguage)) {
			const availableForRoute = assertSupportedRoute(route);
			const currentRoute = await loadFamilyKindLayoutForMutation(
				ctx,
				visitorId,
				route,
			);
			const nextRoute = availableForRoute.includes(blockKind)
				? setBlockVisibility(currentRoute, blockKind, visible)
				: currentRoute;
			await storeFamilyKindLayout(
				ctx,
				visitorId,
				route,
				nextRoute,
				updatedAt,
			);
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
		const available = assertSupportedRoute(route);
		assertReadingBlockOrder(order, available);
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
		const available = assertSupportedRoute(route);
		assertReadingBlockSupported(blockKind, available);
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
