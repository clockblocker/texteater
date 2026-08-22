import { type Infer, v } from "convex/values";
import type {
	LemmaCatalogMiss,
	ReadingCatalogMiss,
	ReadingKnowledgeCatalogMiss,
} from "dumgen";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { canonicalJson } from "./model/canonicalJson";
import {
	requireActiveResolutionSession,
	settleFailed,
} from "./model/resolutionSessions";
import {
	catalogMissRouteMatches,
	catalogMissValidator,
	resolutionSessionGuardValidator,
} from "./model/validators";

type CatalogMiss =
	| LemmaCatalogMiss
	| ReadingCatalogMiss
	| ReadingKnowledgeCatalogMiss;
type ValidatedCatalogMiss = Infer<typeof catalogMissValidator>;

const MAX_IDENTIFIER_LENGTH = 200;
const MAX_CATALOG_MISS_JSON_LENGTH = 20_000;
const MAX_FEATURES = 64;
const MAX_FEATURE_VALUES = 16;

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

function assertBoundedLemma(lemma: {
	canonicalForm: string;
	family: string;
	kind: string;
	coreFeatures: Record<string, null | string | string[]>;
}): void {
	assertBoundedString(lemma.canonicalForm, "Catalog candidate canonicalForm");
	assertBoundedString(lemma.family, "Catalog route family");
	assertBoundedString(lemma.kind, "Catalog route kind");
	const entries = Object.entries(lemma.coreFeatures);
	if (entries.length > MAX_FEATURES) {
		throw new Error("Catalog candidate has too many Core Features.");
	}
	for (const [name, rawValue] of entries) {
		assertBoundedString(name, "Catalog Core Feature name");
		const values = Array.isArray(rawValue) ? rawValue : [rawValue];
		if (values.length > MAX_FEATURE_VALUES) {
			throw new Error("Catalog Core Feature has too many values.");
		}
		for (const value of values) {
			if (value !== null)
				assertBoundedString(value, "Catalog Core Feature value");
		}
	}
}

function assertBoundedMiss(miss: ValidatedCatalogMiss): void {
	if (!catalogMissRouteMatches(miss)) {
		throw new Error(
			"Catalog Miss route must match its candidate Lemma family and kind.",
		);
	}
	assertBoundedString(miss.route.family, "Catalog route family");
	assertBoundedString(miss.route.kind, "Catalog route kind");
	const reading =
		miss.stage === "ReadingKnowledge" ? miss.reading : undefined;
	const candidate = miss.stage === "Reading" ? miss.candidate : reading;
	const lemma = miss.stage === "Lemma" ? miss.candidate : candidate?.lemma;
	if (!lemma) throw new Error("Catalog Miss has no candidate Lemma.");
	assertBoundedLemma(lemma);
	if (candidate) {
		assertBoundedString(
			candidate.emojiDescription,
			"Catalog candidate emojiDescription",
		);
	}
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
			language: miss.language,
			family: miss.route.family,
			kind: miss.route.kind,
			stage: miss.stage,
			reason: miss.reason,
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
			"Required fixed catalog inventory is unavailable.",
			"CatalogMiss",
		);
		return null;
	},
});

export const recordKnowledgeCatalogMiss = internalMutation({
	args: { attemptKey: v.string(), miss: catalogMissValidator },
	returns: v.null(),
	handler: async (ctx, { attemptKey, miss }) => {
		if (miss.stage !== "ReadingKnowledge") {
			throw new Error(
				"Knowledge generation requires a ReadingKnowledge miss.",
			);
		}
		const attempt = await ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_attempt_key", (q) => q.eq("attemptKey", attemptKey))
			.unique();
		if (attempt?.state !== "Running") return null;
		await recordCatalogGrowthSignal(ctx, miss, attemptKey);
		await ctx.db.patch(attempt._id, {
			state: "Failed",
			failureCode: "catalogMiss",
			failureMessage: "Required fixed catalog inventory is unavailable.",
			updatedAt: Date.now(),
		});
		return null;
	},
});
