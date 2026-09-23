import { type Infer, v } from "convex/values";
import type { ApplyGeneratedKnowledgeRequest } from "dumdict/planning";
import type { KnowledgeFailure, KnowledgeRequest } from "dumgen/types";
import { translationLanguageValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	attestedGovernment,
	uncoveredGovernment,
} from "../server/attestedGovernment";
import { knowledgeRequestComplete } from "../server/knowledgeCompletion";
import { parseGermanReading } from "../server/operationalParsing";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
} from "./_generated/server";
import { createDumdictTransaction } from "./dumdictTransaction";
import { loadKnowledgeSettings } from "./knowledgeSettings";
import { canonicalJson } from "./model/canonicalJson";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import { inspectionRequested } from "./model/inspection";
import { scheduleNextWaitingKnowledgeAttempt } from "./model/knowledgeGenerationAttempts";
import { recordKnowledgeProductionRun } from "./model/knowledgeProductionRuns";
import { loadOccurrenceAttestation } from "./model/occurrenceAttestations";
import { loadSentenceAnalysis } from "./model/resolutionLookup";
import { replaceAccumulatedKnowledge } from "./model/shadows";
import {
	directSemanticRelationValidator,
	knowledgeProductionEvidenceValidator,
	relationPublicationFingerprintsValidator,
	relationPublicationRunValidator,
	translationLanguageValidator,
} from "./model/validators";
import {
	loadRelationPublicationAuthorization,
	publicationAuthorizationValidator,
	recordCommittedRelationRun,
	recordRejectedRelationOutput,
	relationPublicationAllowedAtCommit,
} from "./relationPublication";

const attemptInputValidator = v.object({
	attemptKey: v.string(),
	visitorId: v.string(),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
});

async function scheduleRun(ctx: MutationCtx, attemptKey: string) {
	const inspect = await inspectionRequested(ctx, attemptKey);
	await ctx.scheduler.runAfter(
		0,
		internal.knowledgeGenerationActions.runKnowledgeGeneration,
		{ attemptKey, ...(inspect ? { inspect } : {}) },
	);
}

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

async function hasActiveGenerationAttempt(
	ctx: KnowledgeStateCtx,
	ownerReadingKey: string,
): Promise<boolean> {
	const [scheduled, running] = await Promise.all(
		(["Scheduled", "Running"] as const).map((state) =>
			ctx.db
				.query("knowledgeGenerationAttempts")
				.withIndex("by_owner_reading_key_and_state", (q) =>
					q.eq("ownerReadingKey", ownerReadingKey).eq("state", state),
				)
				.take(1),
		),
	);
	return scheduled.length > 0 || running.length > 0;
}

function coveredTranslationLanguages(
	accumulated: {
		readonly knowledge: unknown;
		readonly coveredTranslationLanguages?: readonly string[];
	} | null,
): Set<Dumrel.TranslationLanguage> {
	const covered = new Set<Dumrel.TranslationLanguage>();
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
		if (
			Array.isArray(Reflect.get(translations, language)) &&
			Reflect.get(translations, language).length > 0
		)
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

/** The governed prepositions intake attested for this occurrence (ADR 0030). */
async function occurrenceGovernment(
	ctx: MutationCtx,
	occurrence: NonNullable<
		Awaited<ReturnType<typeof loadOccurrenceAttestation>>
	>,
) {
	return attestedGovernment(
		await loadSentenceAnalysis(ctx, occurrence.sentence._id),
		{
			stitchedText: occurrence.sentence.stitchedText,
			segments: occurrence.segments,
		},
		occurrence.memberSegmentIndices,
	);
}

export async function scheduleKnowledgeGeneration(
	ctx: MutationCtx,
	input: {
		attemptKey: string;
		knowledgeDraftJson?: string;
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
			.length === 0 &&
		uncoveredGovernment(
			await occurrenceGovernment(ctx, occurrence),
			accumulated.knowledge,
		).length === 0
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
			const waiting = await hasActiveGenerationAttempt(
				ctx,
				ownerReadingKey,
			);
			await ctx.db.patch(existing._id, {
				state: waiting ? "Waiting" : "Scheduled",
				failureCode: undefined,
				failureMessage: undefined,
				updatedAt: Date.now(),
			});
			if (!waiting) await scheduleRun(ctx, input.attemptKey);
		}
		return;
	}
	const now = Date.now();
	const waiting = await hasActiveGenerationAttempt(ctx, ownerReadingKey);
	await ctx.db.insert("knowledgeGenerationAttempts", {
		...input,
		ownerReadingKey,
		translationLanguages,
		state: waiting ? "Waiting" : "Scheduled",
		createdAt: now,
		updatedAt: now,
	});
	if (waiting) return;
	await scheduleRun(ctx, input.attemptKey);
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

const generationInputValidator = v.union(
	v.null(),
	v.object({ kind: v.literal("Full") }),
	v.object({
		kind: v.literal("Generate"),
		reading: v.any(),
		encounter: v.any(),
		attestation: v.any(),
		existingKnowledge: v.any(),
		knowledgeDraftJson: v.optional(v.string()),
		runNumber: v.number(),
		translationLanguages: v.array(translationLanguageValidator),
		/** Knowledge is Full: ask only for what this occurrence adds. */
		topUpOnly: v.boolean(),
		/** Attested government the Reading does not store yet. */
		governedPrepositions: v.array(
			v.object({
				preposition: v.string(),
				case: v.union(
					v.literal("Acc"),
					v.literal("Dat"),
					v.literal("Gen"),
				),
			}),
		),
		authorization: publicationAuthorizationValidator,
	}),
);

export type GenerationInput = Infer<typeof generationInputValidator>;

/**
 * Claims one generation run and returns everything the model run needs.
 *
 * Marking the attempt Running, loading the occurrence, and reading the
 * relation-publication authorization used to be three hops; the action pays
 * one and receives one consistent snapshot.
 */
export const begin = internalMutation({
	args: { attemptKey: v.string() },
	returns: generationInputValidator,
	handler: async (ctx, { attemptKey }): Promise<GenerationInput> => {
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
		const occurrence = await loadOccurrenceAttestation(
			ctx,
			attempt.attestationId,
		);
		const governedPrepositions = occurrence
			? uncoveredGovernment(
					await occurrenceGovernment(ctx, occurrence),
					accumulated?.knowledge,
				)
			: [];
		if (
			accumulated?.status === "Full" &&
			missingTranslations.length === 0 &&
			governedPrepositions.length === 0
		) {
			await ctx.db.patch(attempt._id, {
				state: "LostRace",
				updatedAt: Date.now(),
			});
			await scheduleNextWaitingKnowledgeAttempt(
				ctx,
				attempt.ownerReadingKey,
			);
			return { kind: "Full" };
		}
		let runNumber = attempt.runNumber ?? 1;
		if (attempt.state === "Scheduled" || attempt.state === "Failed") {
			runNumber = (attempt.runNumber ?? 0) + 1;
			await ctx.db.patch(attempt._id, {
				state: "Running",
				runNumber,
				publicationSequence: undefined,
				failureCode: undefined,
				failureMessage: undefined,
				updatedAt: Date.now(),
			});
		}
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
			kind: "Generate",
			reading: occurrence.publicReading,
			encounter: occurrence.encounter,
			attestation: occurrence.publicAttestation,
			existingKnowledge: accumulated?.knowledge ?? {},
			...(attempt.knowledgeDraftJson
				? { knowledgeDraftJson: attempt.knowledgeDraftJson }
				: {}),
			runNumber,
			translationLanguages: missingTranslations,
			topUpOnly: accumulated?.status === "Full",
			governedPrepositions,
			authorization: await loadRelationPublicationAuthorization(ctx),
		};
	},
});

async function failAttempt(
	ctx: MutationCtx,
	attempt: Doc<"knowledgeGenerationAttempts">,
	failureCode: string,
	productionEvidence?: Infer<typeof knowledgeProductionEvidenceValidator>,
): Promise<void> {
	if (productionEvidence)
		await recordKnowledgeProductionRun(
			ctx,
			attempt,
			productionEvidence,
			"Failure",
		);
	if (attempt.state === "Committed" || attempt.state === "LostRace") return;
	await ctx.db.patch(attempt._id, {
		state: "Failed",
		failureCode: failureCode.slice(0, 100),
		failureMessage: "Knowledge generation failed. Please retry.",
		updatedAt: Date.now(),
	});
	await scheduleNextWaitingKnowledgeAttempt(ctx, attempt.ownerReadingKey);
}

export const fail = internalMutation({
	args: {
		attemptKey: v.string(),
		failureCode: v.string(),
		failureMessage: v.string(),
		productionEvidence: v.optional(knowledgeProductionEvidenceValidator),
		/** A relation run whose model output was rejected before publication. */
		rejectedRelationRun: v.optional(
			v.object({
				runNumber: v.number(),
				requestedKinds: v.array(directSemanticRelationValidator),
				artifactPath: v.union(v.string(), v.null()),
				fingerprints: relationPublicationFingerprintsValidator,
			}),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const attempt = await findGenerationAttempt(ctx, args.attemptKey);
		if (!attempt) return null;
		if (args.rejectedRelationRun)
			await recordRejectedRelationOutput(
				ctx,
				attempt,
				args.rejectedRelationRun,
			);
		await failAttempt(
			ctx,
			attempt,
			args.failureCode,
			args.productionEvidence,
		);
		return null;
	},
});

const BASE_TEXT_ASPECTS = new Set([
	"definition",
	"transcription",
	"translations",
]);
const MAX_PUBLISHED_CHANGES_PER_READING = 500;

/**
 * Publishes one batch of generated Knowledge for a Running attempt.
 *
 * This mutation owns the publication sequence, drops changes this run has
 * already published, rechecks the relation-publication gate in the
 * transaction that would create edges, plans the dictionary change against
 * the state it commits into, and records evidence and attempt state. The
 * action that produced the Knowledge only decides when a batch is final.
 */
export const publish = internalMutation({
	args: {
		attemptKey: v.string(),
		final: v.boolean(),
		reading: v.any(),
		changes: v.array(v.any()),
		pendingRelations: v.array(v.any()),
		productionEvidence: knowledgeProductionEvidenceValidator,
		relationPublication: relationPublicationRunValidator,
	},
	returns: v.union(
		v.object({ status: v.literal("Committed") }),
		v.object({ status: v.literal("AlreadyFull") }),
		v.object({ status: v.literal("Ignored") }),
		v.object({ status: v.literal("Rejected"), message: v.string() }),
	),
	handler: async (ctx, args) => {
		const attempt = await findGenerationAttempt(ctx, args.attemptKey);
		if (!attempt)
			throw new Error("Knowledge generation attempt does not exist.");
		const runNumber = args.relationPublication.runNumber;
		if (
			attempt.state !== "Running" ||
			(attempt.runNumber ?? 1) !== runNumber
		)
			return { status: "Ignored" as const };
		if (
			!args.final &&
			(args.relationPublication.requestedKinds.length ||
				args.relationPublication.proposals.length ||
				args.pendingRelations.length ||
				args.changes.some(
					(change) =>
						!change || !BASE_TEXT_ASPECTS.has(change.aspect),
				))
		)
			throw new Error("Incremental publication accepts only base text.");
		const sequence = (attempt.publicationSequence ?? 0) + 1;
		const accumulated = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		const requestedTranslations = attempt.translationLanguages ?? ["en"];
		if (
			!attempt.publicationSequence &&
			accumulated?.status === "Full" &&
			missingTranslationLanguages(accumulated, requestedTranslations)
				.length === 0 &&
			// A Full Reading still takes government a new sentence attests.
			!args.changes.some(
				(change) => change?.aspect === "governedPrepositions",
			)
		) {
			await ctx.db.patch(attempt._id, {
				state: "LostRace",
				updatedAt: Date.now(),
			});
			await scheduleNextWaitingKnowledgeAttempt(
				ctx,
				attempt.ownerReadingKey,
			);
			return { status: "AlreadyFull" as const };
		}

		const publishRelations = await relationPublicationAllowedAtCommit(
			ctx,
			args.relationPublication,
		);
		const publishable = generatedKnowledgeAllowedForPublication(
			{ changes: args.changes, pendingRelations: args.pendingRelations },
			publishRelations ? args.relationPublication.requestedKinds : [],
		);
		const published = new Set(
			(
				await ctx.db
					.query("knowledgeChanges")
					.withIndex("by_owner_reading_key", (q) =>
						q.eq("ownerReadingKey", attempt.ownerReadingKey),
					)
					.take(MAX_PUBLISHED_CHANGES_PER_READING)
			)
				.filter((row) =>
					row.knowledgeChangeKey.startsWith(
						`${attempt.attemptKey}:${runNumber}:`,
					),
				)
				.map((row) => canonicalJson(row.change)),
		);
		const changes = publishable.changes.filter(
			(change) => !published.has(canonicalJson(change)),
		);

		const dictionary = await createDumdictTransaction(
			ctx,
		).applyGeneratedKnowledge({
			reading: parseGermanReading(args.reading),
			changes,
			pendingRelations: publishable.pendingRelations,
		} as ApplyGeneratedKnowledgeRequest<"de">);
		if (dictionary.status !== "committed") {
			const message =
				dictionary.message ??
				"Generated Knowledge could not be planned.";
			// An incremental batch may retry with the final publication.
			if (!args.final) return { status: "Rejected" as const, message };
			if (args.relationPublication.requestedKinds.length > 0)
				await recordCommittedRelationRun(
					ctx,
					attempt,
					args.relationPublication,
					true,
				);
			await failAttempt(
				ctx,
				attempt,
				"generationFailed",
				args.productionEvidence,
			);
			return { status: "Rejected" as const, message };
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
		const complete = knowledgeRequestComplete(
			knowledge,
			args.productionEvidence.request as KnowledgeRequest,
			args.productionEvidence.failures as KnowledgeFailure[],
		);
		if (args.final)
			await recordKnowledgeProductionRun(
				ctx,
				attempt,
				args.productionEvidence,
				args.productionEvidence.failures.length ? "Partial" : "Success",
			);
		await replaceAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
			knowledge,
			{
				status: !args.final
					? (accumulated?.status ?? "Partial")
					: complete
						? "Full"
						: "Partial",
			},
		);
		const refreshed = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		if (refreshed) {
			await ctx.db.patch(refreshed._id, {
				coveredTranslationLanguages: [
					...new Set([...coveredTranslationLanguages(refreshed)]),
				],
			});
		}
		await Promise.all(
			changes.map((change, index) =>
				ctx.db.insert("knowledgeChanges", {
					knowledgeChangeKey: `${attempt.attemptKey}:${runNumber}:${sequence}:${index}`,
					ownerReadingKey: attempt.ownerReadingKey,
					change,
					createdAt: Date.now(),
				}),
			),
		);
		if (!args.final) {
			await ctx.db.patch(attempt._id, {
				publicationSequence: sequence,
				updatedAt: Date.now(),
			});
			return { status: "Committed" as const };
		}
		await recordCommittedRelationRun(
			ctx,
			attempt,
			args.relationPublication,
			!publishRelations,
		);
		await ctx.db.patch(attempt._id, {
			publicationSequence: sequence,
			state: args.productionEvidence.failures.length
				? "Failed"
				: "Committed",
			failureCode: args.productionEvidence.failures.length
				? "partialKnowledge"
				: undefined,
			failureMessage: args.productionEvidence.failures.length
				? `Saved available Knowledge. Could not complete: ${[...new Set(args.productionEvidence.failures.map((failure) => (failure.leaf ? `${failure.aspect}/${failure.leaf}` : failure.aspect)))].join(", ")}.`
				: undefined,
			updatedAt: Date.now(),
		});
		await scheduleNextWaitingKnowledgeAttempt(ctx, attempt.ownerReadingKey);
		return { status: "Committed" as const };
	},
});
