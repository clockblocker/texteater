import type { GovernedPrepositionDraft } from "dumgen/types";
import { translationLanguageValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	attestedGovernment,
	uncoveredGovernment,
} from "../../server/attestedGovernment";
import type { KnowledgeCoverage } from "../../server/knowledgeCompletion";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { loadOccurrenceAttestation } from "./occurrenceAttestations";
import { loadSentenceAnalysis } from "./resolutionLookup";

/**
 * Knowledge coverage: what one occurrence's demand still lacks from its
 * Reading's accumulated Knowledge. Scheduling, claiming, and publication read
 * this one calculation and apply their own lifecycle rule to the result.
 */

type AccumulatedKnowledge = Doc<"accumulatedKnowledge">;
type Occurrence = NonNullable<
	Awaited<ReturnType<typeof loadOccurrenceAttestation>>
>;

export type MissingKnowledge = {
	/** The Reading's base request has not been covered yet. */
	readonly base: boolean;
	readonly translationLanguages: readonly Dumrel.TranslationLanguage[];
	/** Government this occurrence attests that the Reading's Valency Frame lacks. */
	readonly government: readonly GovernedPrepositionDraft[];
};

export function findAccumulatedKnowledge(
	ctx: MutationCtx | QueryCtx,
	ownerReadingKey: string,
) {
	return ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
}

export function coveredTranslationLanguages(
	knowledge: unknown,
): Dumrel.TranslationLanguage[] {
	if (!knowledge || typeof knowledge !== "object" || Array.isArray(knowledge))
		return [];
	const translations = Reflect.get(knowledge, "translations");
	if (!translations || typeof translations !== "object") return [];
	return translationLanguageValues.filter((language) => {
		const values = Reflect.get(translations, language);
		return Array.isArray(values) && values.length > 0;
	});
}

/** The governed prepositions intake attested for this occurrence (ADR 0034). */
export async function occurrenceGovernment(
	ctx: MutationCtx,
	occurrence: Occurrence,
): Promise<GovernedPrepositionDraft[]> {
	return attestedGovernment(
		await loadSentenceAnalysis(ctx, occurrence.sentence._id),
		{
			stitchedText: occurrence.sentence.stitchedText,
			segments: occurrence.segments,
		},
		occurrence.memberSegmentIndices,
	);
}

export function missingKnowledge(
	accumulated: AccumulatedKnowledge | null,
	demand: {
		readonly translationLanguages: readonly Dumrel.TranslationLanguage[];
		readonly attestedGovernment: readonly GovernedPrepositionDraft[];
	},
): MissingKnowledge {
	const covered = new Set(
		coveredTranslationLanguages(accumulated?.knowledge),
	);
	return {
		base: accumulated?.status !== "Full",
		translationLanguages: demand.translationLanguages.filter(
			(language) => !covered.has(language),
		),
		government: uncoveredGovernment(
			demand.attestedGovernment,
			accumulated?.knowledge,
		),
	};
}

export function nothingMissing(missing: MissingKnowledge): boolean {
	return (
		!missing.base &&
		missing.translationLanguages.length === 0 &&
		missing.government.length === 0
	);
}

/** Stored content plus the evidence that covers what content cannot show. */
export function knowledgeCoverageOf(
	accumulated: AccumulatedKnowledge | null,
	knowledge: unknown = accumulated?.knowledge,
): KnowledgeCoverage {
	return {
		knowledge: knowledge ?? {},
		checkedRelationKinds: accumulated?.checkedRelationKinds ?? [],
	};
}

/** Records what a final publication covered beside the content it wrote. */
export async function recordCoverageEvidence(
	ctx: MutationCtx,
	accumulated: AccumulatedKnowledge,
	answeredRelationKinds: readonly Dumrel.DirectSemanticRelation[],
): Promise<void> {
	await ctx.db.patch(accumulated._id, {
		coveredTranslationLanguages: coveredTranslationLanguages(
			accumulated.knowledge,
		),
		...(answeredRelationKinds.length
			? {
					checkedRelationKinds: [
						...new Set([
							...(accumulated.checkedRelationKinds ?? []),
							...answeredRelationKinds,
						]),
					],
				}
			: {}),
	});
}
