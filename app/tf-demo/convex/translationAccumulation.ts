import { isRecord } from "common-utils";
import { v } from "convex/values";
import { checkApplyGeneratedKnowledgeRequest } from "dumdict/planning";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { parseReading } from "../server/operationalParsing";
import { internalMutation, internalQuery } from "./_generated/server";
import { createDumdictTransaction } from "./model/dumdictTransaction";
import {
	findAccumulatedKnowledge,
	recordCoverageEvidence,
} from "./model/knowledgeCoverage";
import { loadOccurrenceAttestation } from "./model/occurrenceAttestations";
import { replaceAccumulatedKnowledge } from "./model/shadows";
import { translationLanguageValidator } from "./model/validators";

/**
 * Translation accumulation (ADR 0047): a Reading's translations grow click
 * by click. `begin` hands the run its occurrence and the Reading's stored
 * translations; `publish` adds what the run found missing to the Reading's
 * note, through the dictionary, and keeps its accumulated Knowledge in
 * step. Nothing else is recorded: the note is the consumer.
 */

/** The Reading's stored Knowledge: its note's, else its accumulated row's. */
function storedKnowledge(
	record: unknown,
	accumulated: { readonly knowledge?: unknown } | null,
): unknown {
	return isRecord(record) && record.knowledge !== undefined
		? record.knowledge
		: accumulated?.knowledge;
}

export const begin = internalQuery({
	args: {
		attestationId: v.id("attestations"),
		languages: v.array(translationLanguageValidator),
	},
	returns: v.union(
		v.null(),
		v.object({
			readingId: v.id("readings"),
			reading: v.any(),
			encounter: v.any(),
			attestation: v.any(),
			translations: v.any(),
		}),
	),
	handler: async (ctx, args) => {
		const occurrence = await loadOccurrenceAttestation(
			ctx,
			args.attestationId,
		);
		if (!occurrence) return null;
		const [entry, accumulated] = await Promise.all([
			ctx.db
				.query("readingEntries")
				.withIndex("by_reading_id", (q) =>
					q.eq("readingId", occurrence.reading._id),
				)
				.unique(),
			findAccumulatedKnowledge(ctx, occurrence.reading.readingKey),
		]);
		const knowledge = storedKnowledge(entry?.record, accumulated);
		const stored =
			isRecord(knowledge) && isRecord(knowledge.translations)
				? knowledge.translations
				: {};
		// A language with nothing stored is Knowledge Production's to fill.
		const translations = Object.fromEntries(
			args.languages.flatMap((language) => {
				const texts = stored[language];
				return Array.isArray(texts) &&
					texts.length > 0 &&
					texts.every((text) => typeof text === "string")
					? [[language, texts]]
					: [];
			}),
		);
		if (Object.keys(translations).length === 0) return null;
		return {
			readingId: occurrence.reading._id,
			reading: occurrence.publicReading,
			encounter: occurrence.encounter,
			attestation: occurrence.publicAttestation,
			translations,
		};
	},
});

/**
 * Adds the translations a run found missing. Only translation Contributes
 * come in, and Dumdict plans them against the state this transaction
 * reads, so a concurrent writer never loses them. The accumulated
 * Knowledge keeps its status.
 */
export const publish = internalMutation({
	args: {
		readingId: v.id("readings"),
		reading: v.any(),
		changes: v.array(v.any()),
	},
	returns: v.union(
		v.object({ status: v.literal("Committed") }),
		v.object({ status: v.literal("Rejected"), message: v.string() }),
	),
	handler: async (ctx, args) => {
		if (
			args.changes.length === 0 ||
			args.changes.some(
				(change) =>
					!isRecord(change) ||
					change.kind !== "Contribute" ||
					change.aspect !== "translations",
			)
		)
			throw new Error(
				"Translation accumulation publishes translation Contributes only.",
			);
		const stored = await ctx.db.get(args.readingId);
		if (!stored)
			return { status: "Rejected" as const, message: "No such Reading." };
		const reading = parseReading(args.reading);
		if (readingIdentityKey(reading) !== stored.readingKey)
			throw new Error("The Reading does not match its stored identity.");
		// The changes arrive as v.any(); Dumdict parses them here.
		const request = checkApplyGeneratedKnowledgeRequest(
			reading.lemma.language,
			{
				reading,
				changes: args.changes,
				pendingRelations: [],
			},
		);
		const dictionary =
			request.status === "ok"
				? await createDumdictTransaction(
						ctx,
						reading.lemma.language,
					).applyGeneratedKnowledge(request.request)
				: request;
		if (dictionary.status !== "committed")
			return {
				status: "Rejected" as const,
				message:
					("message" in dictionary
						? dictionary.message
						: undefined) ??
					"The translations could not be planned.",
			};
		const [entry, accumulated] = await Promise.all([
			ctx.db
				.query("readingEntries")
				.withIndex("by_reading_id", (q) =>
					q.eq("readingId", args.readingId),
				)
				.unique(),
			findAccumulatedKnowledge(ctx, stored.readingKey),
		]);
		await replaceAccumulatedKnowledge(
			ctx,
			stored.readingKey,
			storedKnowledge(entry?.record, accumulated) ?? {},
		);
		const refreshed = await findAccumulatedKnowledge(
			ctx,
			stored.readingKey,
		);
		if (refreshed) await recordCoverageEvidence(ctx, refreshed, []);
		return { status: "Committed" as const };
	},
});
