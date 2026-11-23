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

/**
 * Valency accumulation (ADR 0034): a Reading's concrete Valency Patterns
 * grow click by click, and each Attestation records the concrete pattern it
 * realized (`realizedValencyPattern`) so each Visitor sees only the
 * patterns they have met.
 */

function storedKnowledge(
	record: unknown,
	accumulated: { readonly knowledge?: unknown } | null,
): unknown {
	return isRecord(record) && record.knowledge !== undefined
		? record.knowledge
		: accumulated?.knowledge;
}

function isValencyPattern(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every(
			(complement) =>
				isRecord(complement) && typeof complement.kind === "string",
		)
	);
}

export const begin = internalQuery({
	args: {
		attestationId: v.id("attestations"),
	},
	returns: v.union(
		v.null(),
		v.object({
			readingId: v.id("readings"),
			reading: v.any(),
			encounter: v.any(),
			attestation: v.any(),
			valency: v.any(),
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
		const storedValency =
			isRecord(knowledge) && Array.isArray(knowledge.valency)
				? knowledge.valency.filter(isValencyPattern)
				: [];
		return {
			readingId: occurrence.reading._id,
			reading: occurrence.publicReading,
			encounter: occurrence.encounter,
			attestation: occurrence.publicAttestation,
			valency: storedValency,
		};
	},
});

/**
 * Records `realizedPattern` on the Attestation and, when `changes` is
 * non-empty, contributes the newly discovered Valency Pattern to the
 * Reading's stored Knowledge through Dumdict.
 */
export const publish = internalMutation({
	args: {
		attestationId: v.id("attestations"),
		readingId: v.id("readings"),
		reading: v.any(),
		changes: v.array(v.any()),
		realizedPattern: v.union(v.null(), v.any()),
	},
	returns: v.union(
		v.object({ status: v.literal("Committed") }),
		v.object({ status: v.literal("Rejected"), message: v.string() }),
	),
	handler: async (ctx, args) => {
		if (
			args.changes.some(
				(change) =>
					!isRecord(change) ||
					change.kind !== "Contribute" ||
					change.aspect !== "valency",
			)
		)
			throw new Error(
				"Valency accumulation publishes valency Contributes only.",
			);
		const stored = await ctx.db.get(args.readingId);
		if (!stored)
			return { status: "Rejected" as const, message: "No such Reading." };
		const reading = parseReading(args.reading);
		if (readingIdentityKey(reading) !== stored.readingKey)
			throw new Error("The Reading does not match its stored identity.");

		if (args.changes.length > 0) {
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
						"The valency pattern could not be planned.",
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
		}

		if (
			args.realizedPattern !== null &&
			isValencyPattern(args.realizedPattern)
		) {
			const attestation = await ctx.db.get(args.attestationId);
			if (attestation && attestation.readingId === args.readingId) {
				await ctx.db.patch(args.attestationId, {
					realizedValencyPattern: args.realizedPattern,
				});
			}
		}

		return { status: "Committed" as const };
	},
});
