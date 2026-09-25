import { type Infer, v } from "convex/values";
import type { ApplyGeneratedKnowledgeRequest } from "dumdict/planning";
import type { KnowledgeFailure, KnowledgeRequest } from "dumgen/types";
import { translationLanguageValues } from "dumrel";
import {
	answeredRelationKinds,
	knowledgeRequestComplete,
	withoutAnsweredValency,
} from "../server/knowledgeCompletion";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import { parseGermanReading } from "../server/operationalParsing";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "./_generated/server";
import { createDumdictTransaction } from "./dumdictTransaction";
import { loadKnowledgeSettings } from "./knowledgeSettings";
import { canonicalJson } from "./model/canonicalJson";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import {
	claimKnowledgeRun,
	endKnowledgeRun,
	failKnowledgeRun,
	findKnowledgeAttempt,
	ownsKnowledgeRun,
	promoteNextWaiting,
	recordKnowledgePublication,
	recoverStaleKnowledgeRun,
} from "./model/knowledgeAttempts";
import {
	findAccumulatedKnowledge,
	knowledgeCoverageOf,
	missingKnowledge,
	nothingMissing,
	occurrenceGovernment,
	recordCoverageEvidence,
} from "./model/knowledgeCoverage";
import { recordKnowledgeProductionRun } from "./model/knowledgeProductionRuns";
import {
	assertKey,
	scheduleKnowledgeGeneration,
} from "./model/knowledgeScheduling";
import { loadOccurrenceAttestation } from "./model/occurrenceAttestations";
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

const GENERATION_FAILED_MESSAGE = "Knowledge generation failed. Please retry.";

export const retry = internalMutation({
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
		/** Relation kinds already answered; edges cannot show an empty answer. */
		checkedRelationKinds: v.array(directSemanticRelationValidator),
		knowledgeDraftJson: v.optional(v.string()),
		runNumber: v.number(),
		translationLanguages: v.array(translationLanguageValidator),
		/** Knowledge is Full: ask only for what this occurrence adds. */
		topUpOnly: v.boolean(),
		/** Attested government the Reading's Valency Frame lacks. */
		government: v.array(
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
		const attempt = await findKnowledgeAttempt(ctx, attemptKey);
		// Only a Scheduled attempt has a run to claim; any other action is late.
		if (attempt?.state !== "Scheduled") return null;
		const [accumulated, occurrence] = await Promise.all([
			findAccumulatedKnowledge(ctx, attempt.ownerReadingKey),
			loadOccurrenceAttestation(ctx, attempt.attestationId),
		]);
		if (
			!occurrence ||
			occurrence.reading._id !== attempt.readingId ||
			occurrence.reading.readingKey !== attempt.ownerReadingKey
		) {
			throw new Error(
				"Generation attempt no longer matches its occurrence.",
			);
		}
		const missing = missingKnowledge(accumulated, {
			translationLanguages: attempt.translationLanguages ?? ["en"],
			attestedGovernment: await occurrenceGovernment(ctx, occurrence),
		});
		if (nothingMissing(missing)) {
			await endKnowledgeRun(ctx, attempt, null, { kind: "LostRace" });
			return { kind: "Full" };
		}
		const runNumber = await claimKnowledgeRun(ctx, attempt);
		if (runNumber === null) return null;
		const coverage = knowledgeCoverageOf(accumulated);
		return {
			kind: "Generate",
			reading: occurrence.publicReading,
			encounter: occurrence.encounter,
			attestation: occurrence.publicAttestation,
			existingKnowledge: coverage.knowledge,
			checkedRelationKinds: [...coverage.checkedRelationKinds],
			...(attempt.knowledgeDraftJson
				? { knowledgeDraftJson: attempt.knowledgeDraftJson }
				: {}),
			runNumber,
			translationLanguages: [...missing.translationLanguages],
			topUpOnly: !missing.base,
			government: [...missing.government],
			authorization: await loadRelationPublicationAuthorization(ctx),
		};
	},
});

export const fail = internalMutation({
	args: {
		attemptKey: v.string(),
		/** The run the action claimed, or null when it never claimed one. */
		runNumber: v.union(v.number(), v.null()),
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
		const attempt = await findKnowledgeAttempt(ctx, args.attemptKey);
		if (!attempt || !ownsKnowledgeRun(attempt, args.runNumber)) return null;
		if (args.rejectedRelationRun)
			await recordRejectedRelationOutput(
				ctx,
				attempt,
				args.rejectedRelationRun,
			);
		await failKnowledgeRun(
			ctx,
			attempt,
			args.runNumber,
			{
				failureCode: args.failureCode,
				// Provider text never reaches the learner; only the code persists.
				failureMessage: GENERATION_FAILED_MESSAGE,
			},
			args.productionEvidence,
		);
		return null;
	},
});

export const recoverStaleRun = internalMutation({
	args: { attemptKey: v.string(), runNumber: v.number() },
	returns: v.boolean(),
	handler: (ctx, args) => recoverStaleKnowledgeRun(ctx, args),
});

/** Starts a Reading's next Waiting demand when its cooldown ends. */
export const promoteWaiting = internalMutation({
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		await promoteNextWaiting(ctx, ownerReadingKey);
		return null;
	},
});

/**
 * Stores the source verb a Participle Source names when the dictionary has no
 * Reading of it yet, so the link always has a target (ADR 0035). A Lemma that
 * gained a Reading since the action looked keeps it.
 */
async function ensureParticipleSourceReading(
	ctx: MutationCtx,
	reading: ReturnType<typeof parseGermanReading>,
): Promise<void> {
	const lemma = await ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(reading.lemma)),
		)
		.unique();
	if (
		lemma &&
		(await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.first())
	)
		return;
	const stored = await createDumdictTransaction(ctx).ensureReadingEntry({
		entry: {
			reading,
			attestedTranslations: [],
			attestations: [],
			notes: "",
		},
	});
	if (stored.status !== "committed")
		throw new Error("The Participle Source's verb could not be stored.");
}

const BASE_TEXT_ASPECTS = new Set([
	"definition",
	"transcription",
	"translations",
]);
const MAX_PUBLISHED_CHANGES_PER_RUN = 500;

/**
 * Publishes one batch of generated Knowledge for a Running attempt.
 *
 * This mutation owns the publication sequence, drops changes this run has
 * already published, rechecks the relation-publication gate in the
 * transaction that would create edges, plans the dictionary change against
 * the state it commits into, and records evidence and attempt state. The
 * action that produced the Knowledge only decides when a batch is final, and
 * sends a final publication too large for one plan as relation chunks first.
 * A batch whose plan still exceeds one commit writes nothing and returns
 * OverBudget, so the action splits it and sends the parts.
 */
export const publish = internalMutation({
	args: {
		attemptKey: v.string(),
		final: v.boolean(),
		reading: v.any(),
		/** A final batch's new source-verb Reading for its Participle Source. */
		participleSourceReading: v.optional(v.any()),
		changes: v.array(v.any()),
		pendingRelations: v.array(v.any()),
		productionEvidence: knowledgeProductionEvidenceValidator,
		relationPublication: relationPublicationRunValidator,
	},
	returns: v.union(
		v.object({ status: v.literal("Committed") }),
		v.object({ status: v.literal("AlreadyFull") }),
		v.object({ status: v.literal("Ignored") }),
		v.object({ status: v.literal("OverBudget") }),
		v.object({ status: v.literal("Rejected"), message: v.string() }),
	),
	handler: async (ctx, args) => {
		const attempt = await findKnowledgeAttempt(ctx, args.attemptKey);
		if (!attempt)
			throw new Error("Knowledge generation attempt does not exist.");
		const runNumber = args.relationPublication.runNumber;
		if (!ownsKnowledgeRun(attempt, runNumber))
			return { status: "Ignored" as const };
		// An incremental batch is base text or one chunk of a final
		// publication's relations; the gate below filters relations either way.
		if (
			!args.final &&
			args.changes.some(
				(change) =>
					!change ||
					!(
						BASE_TEXT_ASPECTS.has(change.aspect) ||
						change.aspect === "semanticRelations"
					),
			)
		)
			throw new Error(
				"Incremental publication accepts only base text and relations.",
			);
		const sequence = (attempt.publicationSequence ?? 0) + 1;
		const accumulated = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		// The race check: before its first batch, did another run cover this
		// demand since the claim? A Full Reading still takes government a new
		// sentence attests, which only the batch itself shows here.
		if (
			!attempt.publicationSequence &&
			nothingMissing(
				missingKnowledge(accumulated, {
					translationLanguages: attempt.translationLanguages ?? [
						"en",
					],
					attestedGovernment: [],
				}),
			) &&
			!args.changes.some((change) => change?.aspect === "valency")
		) {
			await endKnowledgeRun(ctx, attempt, runNumber, {
				kind: "LostRace",
			});
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
		// Only this run's own rows: its keys share the attempt and run prefix.
		const runPrefix = `${attempt.attemptKey}:${runNumber}:`;
		const published = new Set(
			(
				await ctx.db
					.query("knowledgeChanges")
					.withIndex("by_knowledge_change_key", (q) =>
						q
							.gte("knowledgeChangeKey", runPrefix)
							.lt("knowledgeChangeKey", `${runPrefix}\uffff`),
					)
					.take(MAX_PUBLISHED_CHANGES_PER_RUN)
			).map((row) => canonicalJson(row.change)),
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
		// Nothing above wrote, so the action may split this batch and resend.
		if (dictionary.status === "overBudget")
			return { status: "OverBudget" as const };
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
			await failKnowledgeRun(
				ctx,
				attempt,
				runNumber,
				{
					failureCode: "generationFailed",
					failureMessage: GENERATION_FAILED_MESSAGE,
				},
				args.productionEvidence,
			);
			return { status: "Rejected" as const, message };
		}
		if (args.final && args.participleSourceReading)
			await ensureParticipleSourceReading(
				ctx,
				parseGermanReading(args.participleSourceReading),
			);
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
		const answered = args.final
			? answeredRelationKinds(
					args.relationPublication.requestedKinds,
					publishRelations,
					args.productionEvidence.failures,
				)
			: [];
		const coverage = knowledgeCoverageOf(accumulated, knowledge);
		const complete = knowledgeRequestComplete(
			{
				knowledge: coverage.knowledge,
				checkedRelationKinds: [
					...coverage.checkedRelationKinds,
					...answered,
				],
			},
			withoutAnsweredValency(
				args.productionEvidence.request as KnowledgeRequest,
			),
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
				// A top-up that partly fails never downgrades a Full Reading; its
				// content still shows the translations and government it lacks.
				status:
					(args.final && complete) || accumulated?.status === "Full"
						? "Full"
						: "Partial",
			},
		);
		const refreshed = await findAccumulatedKnowledge(
			ctx,
			attempt.ownerReadingKey,
		);
		if (refreshed) await recordCoverageEvidence(ctx, refreshed, answered);
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
			await recordKnowledgePublication(ctx, attempt, sequence);
			return { status: "Committed" as const };
		}
		await recordCommittedRelationRun(
			ctx,
			attempt,
			args.relationPublication,
			!publishRelations,
		);
		const { failures } = args.productionEvidence;
		await endKnowledgeRun(
			ctx,
			attempt,
			runNumber,
			failures.length
				? {
						kind: "Failed",
						failureCode: "partialKnowledge",
						failureMessage: `Saved available Knowledge. Could not complete: ${[...new Set(failures.map((failure) => (failure.leaf ? `${failure.aspect}/${failure.leaf}` : failure.aspect)))].join(", ")}.`,
					}
				: { kind: "Committed" },
			{ publicationSequence: sequence },
		);
		return { status: "Committed" as const };
	},
});
