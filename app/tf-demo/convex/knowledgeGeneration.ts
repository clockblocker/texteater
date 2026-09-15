import { type FunctionReference, makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { translationLanguageValues } from "dumrel";
import type * as Dumrel from "dumrel/types";

import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	type QueryCtx,
} from "./_generated/server";
import { createDumdictTransaction } from "./dumdictTransaction";
import { loadKnowledgeSettings } from "./knowledgeSettings";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import { loadOccurrenceAttestation } from "./model/occurrenceAttestations";
import { replaceAccumulatedKnowledge } from "./model/shadows";
import {
	dictionaryPlanValidator,
	relationPublicationRunValidator,
} from "./model/validators";
import {
	recordCommittedRelationRun,
	relationPublicationAllowedAtCommit,
} from "./relationPublication";

const attemptInputValidator = v.object({
	attemptKey: v.string(),
	visitorId: v.string(),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
});

const runKnowledgeGeneration = makeFunctionReference<
	"action",
	{ attemptKey: string },
	null
>(
	"knowledgeGenerationActions:runKnowledgeGeneration",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ attemptKey: string },
	null
>;

function assertKey(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > 200) {
		throw new Error(`${name} must contain between 1 and 200 characters.`);
	}
}

type KnowledgeStateCtx = MutationCtx | QueryCtx;

function findGenerationAttempt(ctx: KnowledgeStateCtx, attemptKey: string) {
	return ctx.db
		.query("knowledgeGenerationAttempts")
		.withIndex("by_attempt_key", (q) => q.eq("attemptKey", attemptKey))
		.unique();
}

function findAccumulatedKnowledge(
	ctx: KnowledgeStateCtx,
	ownerReadingKey: string,
) {
	return ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
}

function coveredTranslationLanguages(
	accumulated: {
		readonly knowledge: unknown;
		readonly coveredTranslationLanguages?: readonly string[];
	} | null,
): Set<Dumrel.TranslationLanguage> {
	const covered = new Set<Dumrel.TranslationLanguage>();
	for (const language of accumulated?.coveredTranslationLanguages ?? []) {
		if (language === "en" || language === "ru") covered.add(language);
	}
	const knowledge = accumulated?.knowledge;
	if (
		!knowledge ||
		typeof knowledge !== "object" ||
		Array.isArray(knowledge)
	) {
		return covered;
	}
	const translations = Reflect.get(knowledge, "translations");
	if (!translations || typeof translations !== "object") return covered;
	for (const language of translationLanguageValues) {
		if (Reflect.get(translations, language) !== undefined)
			covered.add(language);
	}
	return covered;
}

function missingTranslationLanguages(
	accumulated: Parameters<typeof coveredTranslationLanguages>[0],
	requested: readonly Dumrel.TranslationLanguage[],
): Dumrel.TranslationLanguage[] {
	const covered = coveredTranslationLanguages(accumulated);
	return requested.filter((language) => !covered.has(language));
}

export async function scheduleKnowledgeGeneration(
	ctx: MutationCtx,
	input: {
		attemptKey: string;
		visitorId: string;
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
	},
): Promise<void> {
	assertKey(input.attemptKey, "attemptKey");
	assertKey(input.visitorId, "visitorId");
	if (!ctx.scheduler) return;
	const occurrence = await loadOccurrenceAttestation(
		ctx,
		input.attestationId,
	);
	if (!occurrence || occurrence.reading._id !== input.readingId) {
		throw new Error(
			"Knowledge generation requires the exact saved occurrence.",
		);
	}
	const ownerReadingKey = occurrence.reading.readingKey;
	const [accumulated, settings] = await Promise.all([
		findAccumulatedKnowledge(ctx, ownerReadingKey),
		loadKnowledgeSettings(ctx, input.visitorId),
	]);
	const translationLanguages = translationLanguageValues.filter(
		(language) => settings.translations[language],
	);
	if (
		accumulated?.status === "Full" &&
		missingTranslationLanguages(accumulated, translationLanguages)
			.length === 0
	) {
		return;
	}

	const existing = await findGenerationAttempt(ctx, input.attemptKey);
	if (existing) {
		if (
			existing.visitorId !== input.visitorId ||
			existing.readingId !== input.readingId ||
			existing.attestationId !== input.attestationId ||
			existing.ownerReadingKey !== ownerReadingKey
		) {
			throw new Error("attemptKey collides with a different occurrence.");
		}
		if (existing.state === "Failed") {
			await ctx.db.patch(existing._id, {
				state: "Scheduled",
				failureCode: undefined,
				failureMessage: undefined,
				updatedAt: Date.now(),
			});
			await ctx.scheduler.runAfter(0, runKnowledgeGeneration, {
				attemptKey: input.attemptKey,
			});
		}
		return;
	}
	const now = Date.now();
	await ctx.db.insert("knowledgeGenerationAttempts", {
		...input,
		ownerReadingKey,
		translationLanguages,
		state: "Scheduled",
		createdAt: now,
		updatedAt: now,
	});
	await ctx.scheduler.runAfter(0, runKnowledgeGeneration, {
		attemptKey: input.attemptKey,
	});
}

export const retry = mutation({
	args: attemptInputValidator.fields,
	returns: v.null(),
	handler: async (ctx, input) => {
		const encounter = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_attestation_id", (q) =>
				q
					.eq("visitorId", input.visitorId)
					.eq("attestationId", input.attestationId),
			)
			.first();
		if (!encounter)
			throw new Error("Visitor has not encountered this Reading.");
		await scheduleKnowledgeGeneration(ctx, input);
		return null;
	},
});

export const ensureForReading = mutation({
	args: {
		visitorId: v.string(),
		readingId: v.id("readings"),
		attestationId: v.id("attestations"),
	},
	returns: v.boolean(),
	handler: async (ctx, { visitorId, readingId, attestationId }) => {
		assertKey(visitorId, "visitorId");
		const attestation = await ctx.db.get(attestationId);
		if (!attestation || attestation.readingId !== readingId) return false;
		const encounter = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_attestation_id", (q) =>
				q.eq("visitorId", visitorId).eq("attestationId", attestationId),
			)
			.first();
		if (!encounter) return false;
		const settings = await loadKnowledgeSettings(ctx, visitorId);
		const languages = translationLanguageValues.filter(
			(language) => settings.translations[language],
		);
		await scheduleKnowledgeGeneration(ctx, {
			attemptKey: `coverage:${encounter._id}:${languages.join(",") || "none"}`,
			visitorId,
			readingId,
			attestationId,
		});
		return true;
	},
});

export const loadInput = internalQuery({
	args: { attemptKey: v.string() },
	returns: v.any(),
	handler: async (ctx, { attemptKey }) => {
		const attempt = await findGenerationAttempt(ctx, attemptKey);
		if (!attempt) return null;
		const accumulated = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		const translationLanguages = attempt.translationLanguages ?? ["en"];
		const missingTranslations = missingTranslationLanguages(
			accumulated,
			translationLanguages,
		);
		if (
			accumulated?.status === "Full" &&
			missingTranslations.length === 0
		) {
			return { kind: "Full" as const };
		}
		const occurrence = await loadOccurrenceAttestation(
			ctx,
			attempt.attestationId,
		);
		if (
			!occurrence ||
			occurrence.reading._id !== attempt.readingId ||
			occurrence.reading.readingKey !== attempt.ownerReadingKey
		) {
			throw new Error(
				"Generation attempt no longer matches its occurrence.",
			);
		}
		return {
			kind: "Generate" as const,
			reading: occurrence.publicReading,
			encounter: occurrence.encounter,
			attestation: occurrence.publicAttestation,
			runNumber: attempt.runNumber ?? 1,
			translationLanguages: missingTranslations,
			translationsOnly: accumulated?.status === "Full",
		};
	},
});

export const markRunning = internalMutation({
	args: { attemptKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { attemptKey }) => {
		const attempt = await findGenerationAttempt(ctx, attemptKey);
		if (!attempt) return null;
		const accumulated = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		const requestedTranslations = attempt.translationLanguages ?? ["en"];
		if (
			accumulated?.status === "Full" &&
			missingTranslationLanguages(accumulated, requestedTranslations)
				.length === 0
		) {
			await ctx.db.patch(attempt._id, {
				state: "LostRace",
				updatedAt: Date.now(),
			});
			return null;
		}
		if (attempt.state === "Scheduled" || attempt.state === "Failed") {
			await ctx.db.patch(attempt._id, {
				state: "Running",
				runNumber: (attempt.runNumber ?? 0) + 1,
				failureCode: undefined,
				failureMessage: undefined,
				updatedAt: Date.now(),
			});
		}
		return null;
	},
});

export const fail = internalMutation({
	args: {
		attemptKey: v.string(),
		failureCode: v.string(),
		failureMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const attempt = await findGenerationAttempt(ctx, args.attemptKey);
		if (
			attempt &&
			attempt.state !== "Committed" &&
			attempt.state !== "LostRace"
		) {
			await ctx.db.patch(attempt._id, {
				state: "Failed",
				failureCode: args.failureCode.slice(0, 100),
				failureMessage: "Knowledge generation failed. Please retry.",
				updatedAt: Date.now(),
			});
		}
		return null;
	},
});

export const commitGenerated = internalMutation({
	args: {
		attemptKey: v.string(),
		plan: dictionaryPlanValidator,
		baseKnowledgePlan: dictionaryPlanValidator,
		generatedChanges: v.array(v.any()),
		relationPublication: relationPublicationRunValidator,
	},
	returns: v.union(
		v.object({ status: v.literal("Committed") }),
		v.object({ status: v.literal("AlreadyFull") }),
		v.object({ status: v.literal("DictionaryConflict") }),
	),
	handler: async (ctx, args) => {
		const attempt = await findGenerationAttempt(ctx, args.attemptKey);
		if (!attempt)
			throw new Error("Knowledge generation attempt does not exist.");
		const accumulated = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		const requestedTranslations = attempt.translationLanguages ?? ["en"];
		if (
			accumulated?.status === "Full" &&
			missingTranslationLanguages(accumulated, requestedTranslations)
				.length === 0
		) {
			await ctx.db.patch(attempt._id, {
				state: "LostRace",
				updatedAt: Date.now(),
			});
			return { status: "AlreadyFull" as const };
		}

		const publishRelations = await relationPublicationAllowedAtCommit(
			ctx,
			args.relationPublication,
		);
		const dictionaryCommit = await createDumdictTransaction(ctx).commit(
			publishRelations ? args.plan : args.baseKnowledgePlan,
		);
		if (dictionaryCommit.status === "conflict") {
			return { status: "DictionaryConflict" as const };
		}
		const reading = await ctx.db.get(attempt.readingId);
		if (!reading || reading.readingKey !== attempt.ownerReadingKey) {
			throw new Error(
				"Generated plan changed the owning Reading identity.",
			);
		}
		const entry = await ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", reading._id))
			.unique();
		const record =
			entry?.record &&
			typeof entry.record === "object" &&
			!Array.isArray(entry.record)
				? (entry.record as Record<string, unknown>)
				: {};
		const knowledge = record.knowledge ?? accumulated?.knowledge ?? {};
		await replaceAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
			knowledge,
			{
				status: "Full",
			},
		);
		const refreshed = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		if (refreshed) {
			await ctx.db.patch(refreshed._id, {
				coveredTranslationLanguages: [
					...new Set([
						...coveredTranslationLanguages(refreshed),
						...requestedTranslations,
					]),
				],
			});
		}
		const committedGeneratedChanges = publishRelations
			? args.generatedChanges
			: generatedKnowledgeAllowedForPublication(
					{ changes: args.generatedChanges, pendingRelations: [] },
					[],
				).changes;
		await Promise.all(
			committedGeneratedChanges.map((change, index) =>
				ctx.db.insert("knowledgeChanges", {
					knowledgeChangeKey: `${attempt.attemptKey}:${index}`,
					ownerReadingKey: attempt.ownerReadingKey,
					change,
					createdAt: Date.now(),
				}),
			),
		);
		await recordCommittedRelationRun(
			ctx,
			attempt,
			args.relationPublication,
			!publishRelations,
		);
		await ctx.db.patch(attempt._id, {
			state: "Committed",
			updatedAt: Date.now(),
		});
		return { status: "Committed" as const };
	},
});
