import { authoredReading } from "dumcorpus/inventories";
import { translationLanguageValues } from "dumrel";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { loadKnowledgeSettings } from "../knowledgeSettings";
import { readingValue } from "./occurrenceAttestations";

/**
 * Asks for the translations a freshly committed occurrence adds to its
 * Reading (ADR 0047), after the click: the run reads the Reading's stored
 * translations when it starts. A Reading's first occurrence asks only
 * when the Reading is authored: a generated one's translations come from
 * that occurrence's own Knowledge run.
 */
export async function scheduleTranslationAccumulation(
	ctx: MutationCtx,
	input: {
		readonly visitorId: string;
		readonly attestationId: Id<"attestations">;
	},
): Promise<void> {
	const attestation = await ctx.db.get(input.attestationId);
	if (!attestation) return;
	const first = await ctx.db
		.query("attestations")
		.withIndex("by_reading_id", (q) =>
			q.eq("readingId", attestation.readingId),
		)
		.first();
	if (first?._id === input.attestationId) {
		const reading = await ctx.db.get(attestation.readingId);
		const lemma = reading && (await ctx.db.get(reading.lemmaId));
		if (
			!reading ||
			!lemma ||
			!authoredReading(readingValue(reading, lemma))
		)
			return;
	}
	const settings = await loadKnowledgeSettings(ctx, input.visitorId);
	const languages = translationLanguageValues.filter(
		(language) => settings.translations[language],
	);
	if (languages.length === 0) return;
	await ctx.scheduler.runAfter(
		0,
		internal.translationAccumulationActions.accumulate,
		{ attestationId: input.attestationId, languages },
	);
}
