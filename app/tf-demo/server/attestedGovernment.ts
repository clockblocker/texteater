import { slotsAt } from "legacy-dumgen/authored";
import type { GovernedPrepositionDraft } from "legacy-dumgen/types";
import {
	fromStoredSentenceAnalysis,
	type StoredSentenceAnalysis,
} from "./sentenceAnalysisStorage";
import { type StoredSegment, storedSegmentRanges } from "./storedSegments";

type StoredSentence = {
	readonly stitchedText: string;
	readonly segments: readonly Pick<StoredSegment, "index" | "text">[];
};

/**
 * The governed prepositions one stored occurrence attests (ADR 0034): intake
 * slots whose governor has a member inside the occurrence's Segments.
 * Empty without an analysis, when intake realized no slot, or when the
 * analysis no longer matches the stored Sentence.
 */
export function attestedGovernment(
	analysis: StoredSentenceAnalysis | null,
	stored: StoredSentence,
	memberSegmentIndices: readonly number[],
): GovernedPrepositionDraft[] {
	if (
		!analysis?.slots.length ||
		analysis.stitchedText !== stored.stitchedText
	)
		return [];
	const ranges = storedSegmentRanges(stored);
	if (!ranges) return [];
	const members = memberSegmentIndices.flatMap((index) => {
		const range = ranges.get(index);
		return range ? [range] : [];
	});
	const offsets = analysis.segments
		.filter((segment) =>
			members.some(
				(range) =>
					segment.offset >= range.start && segment.offset < range.end,
			),
		)
		.map((segment) => segment.offset);
	const found = new Map<string, GovernedPrepositionDraft>();
	for (const { complement } of slotsAt(
		fromStoredSentenceAnalysis(analysis),
		offsets,
	)) {
		// Intake builds every slot from a governable preposition's Lemma.
		const preposition = complement.preposition
			.canonicalForm as GovernedPrepositionDraft["preposition"];
		found.set(`${preposition}/${complement.case}`, {
			preposition,
			case: complement.case,
		});
	}
	return [...found.values()];
}

type StoredComplement = {
	readonly kind?: string;
	readonly preposition?: { readonly canonicalForm?: string };
	readonly governedCase?: string;
};

/**
 * The attested government a Reading's Valency Frame lacks: a preposition and
 * case no Preposition complement holds yet, alternatives included.
 */
export function uncoveredGovernment(
	attested: readonly GovernedPrepositionDraft[],
	knowledge: unknown,
): GovernedPrepositionDraft[] {
	const frame =
		knowledge && typeof knowledge === "object"
			? Reflect.get(knowledge, "valency")
			: undefined;
	const covered = new Set(
		(Array.isArray(frame) ? frame : []).flatMap(
			(slot: { readonly complements?: readonly StoredComplement[] }) =>
				(slot.complements ?? []).flatMap((complement) =>
					complement.kind === "Preposition"
						? [
								`${complement.preposition?.canonicalForm}/${complement.governedCase}`,
							]
						: [],
				),
		),
	);
	return attested.filter(
		(entry) => !covered.has(`${entry.preposition}/${entry.case}`),
	);
}
