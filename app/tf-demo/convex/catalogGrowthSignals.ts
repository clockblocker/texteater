import { type Infer, v } from "convex/values";
import type { CatalogMissSignal } from "../server/resolutionGrammar";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { canonicalJson } from "./model/canonicalJson";
import {
	requireActiveResolutionSession,
	settleFailed,
} from "./model/resolutionSessions";
import {
	catalogMissValidator,
	resolutionSessionGuardValidator,
} from "./model/validators";

type CatalogMiss = CatalogMissSignal;
type ValidatedCatalogMiss = Infer<typeof catalogMissValidator>;

const MAX_IDENTIFIER_LENGTH = 200;
const MAX_CATALOG_MISS_JSON_LENGTH = 20_000;

function fnv1a64(value: string): string {
	let hash = 0xcbf29ce484222325n;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= BigInt(value.charCodeAt(index));
		hash = BigInt.asUintN(64, hash * 0x100000001b3n);
	}
	return hash.toString(16).padStart(16, "0");
}

function assertBoundedString(value: string, label: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(`${label} must contain 1 to 200 characters.`);
	}
}

function assertBoundedMiss(miss: ValidatedCatalogMiss): void {
	assertBoundedString(miss.route, "Catalog route");
	assertBoundedString(miss.stage, "Catalog stage");
	if (miss.message.length > 2000)
		throw new Error("Catalog diagnostic is too long.");
}

/** Stable operational identity for aggregating equal catalog-growth signals. */
export function catalogGrowthSignalIdentity(miss: CatalogMiss): {
	signalKey: string;
	catalogMissJson: string;
} {
	const catalogMissJson = canonicalJson(miss);
	if (catalogMissJson.length > MAX_CATALOG_MISS_JSON_LENGTH) {
		throw new Error(
			"Catalog Miss exceeds the bounded persistence payload.",
		);
	}
	return {
		signalKey: `catalog-miss-v1:${fnv1a64(catalogMissJson)}`,
		catalogMissJson,
	};
}

async function recordCatalogGrowthSignal(
	ctx: MutationCtx,
	miss: ValidatedCatalogMiss,
	requestId: string,
): Promise<void> {
	assertBoundedMiss(miss);
	assertBoundedString(requestId, "Catalog Growth Signal requestId");
	const { signalKey, catalogMissJson } = catalogGrowthSignalIdentity(
		miss as CatalogMiss,
	);
	const existing = await ctx.db
		.query("catalogGrowthSignals")
		.withIndex("by_signal_key", (q) => q.eq("signalKey", signalKey))
		.unique();
	if (existing && existing.catalogMissJson !== catalogMissJson) {
		throw new Error("Catalog Growth Signal identity collision.");
	}
	const now = Date.now();
	if (existing) {
		await ctx.db.patch(existing._id, {
			occurrences: existing.occurrences + 1,
			lastSeenAt: now,
			lastRequestId: requestId,
		});
	} else {
		await ctx.db.insert("catalogGrowthSignals", {
			signalKey,
			route: miss.route,
			stage: miss.stage,
			catalogMissJson,
			occurrences: 1,
			firstSeenAt: now,
			lastSeenAt: now,
			lastRequestId: requestId,
		});
	}
}

export const recordAndSettleCatalogMiss = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		miss: catalogMissValidator,
	},
	returns: v.null(),
	handler: async (ctx, { guard, miss }) => {
		const session = await requireActiveResolutionSession(ctx, guard);
		await recordCatalogGrowthSignal(ctx, miss, guard.requestId);
		await settleFailed(
			ctx,
			session,
			"No reviewed catalog member matches this encounter.",
			"CatalogMiss",
		);
		return null;
	},
});

export const recordKnowledgeCatalogMiss = internalMutation({
	args: { attemptKey: v.string(), miss: catalogMissValidator },
	returns: v.null(),
	handler: async (ctx, { attemptKey, miss }) => {
		const attempt = await ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_attempt_key", (q) => q.eq("attemptKey", attemptKey))
			.unique();
		if (attempt?.state !== "Running") return null;
		await recordCatalogGrowthSignal(ctx, miss, attemptKey);
		await ctx.db.patch(attempt._id, {
			state: "Failed",
			failureCode: "catalogMiss",
			failureMessage:
				"No reviewed catalog member matches this encounter.",
			updatedAt: Date.now(),
		});
		return null;
	},
});
