import { authoredReading } from "dumcorpus/inventories";
import { routeOf } from "dumling";
import { allowedComplementKinds, selectKnowledge } from "dumrel";
import { parseGermanReading } from "../../server/operationalParsing";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { readingValue } from "./occurrenceAttestations";

/**
 * Schedules post-click valency accumulation for a freshly committed
 * occurrence (ADR 0034): extracts or matches the concrete Valency Pattern
 * realized by this Attestation, records `realizedValencyPattern` on the
 * Attestation, and contributes the pattern to the Reading if new.
 *
 * Skips routes whose Knowledge Policy lacks `valency`, and skips an
 * unauthored Reading's very first Attestation (whose `knowledgeGeneration`
 * run produces its initial valency pattern and records it on the
 * Attestation).
 */
export async function scheduleValencyAccumulation(
	ctx: MutationCtx,
	input: {
		readonly attestationId: Id<"attestations">;
		readonly inspectRequestId?: string;
	},
): Promise<void> {
	const attestation = await ctx.db.get(input.attestationId);
	if (!attestation) return;
	const reading = await ctx.db.get(attestation.readingId);
	const lemma = reading && (await ctx.db.get(reading.lemmaId));
	if (!reading || !lemma) return;
	const readingVal = parseGermanReading(readingValue(reading, lemma));
	const selected = selectKnowledge({ route: routeOf(readingVal.lemma) });
	if (
		!selected.success ||
		!("valency" in selected.value) ||
		allowedComplementKinds(readingVal.lemma).length === 0
	)
		return;
	const first = await ctx.db
		.query("attestations")
		.withIndex("by_reading_id", (q) =>
			q.eq("readingId", attestation.readingId),
		)
		.first();
	if (first?._id === input.attestationId && !authoredReading(readingVal))
		return;
	await ctx.scheduler.runAfter(
		0,
		internal.valencyAccumulationActions.accumulate,
		{
			attestationId: input.attestationId,
			...(input.inspectRequestId
				? { inspectRequestId: input.inspectRequestId }
				: {}),
		},
	);
}
