/**
 * The Knowledge gold the valency notation is checked and benched on: every
 * case of the frozen dev and held-out sets whose gold covers valency, its
 * frame in Luna's proposal shape (a preposition is its Canonical Form).
 */
import type * as Dumrel from "dumrel/types";
import {
	type KnowledgeCase,
	type KnowledgeSetName,
	loadKnowledgeSet,
	trackedKnowledgeSetsRoot,
} from "../knowledge/cases.js";
import type {
	FrameContext,
	ProposedComplement,
	ProposedSlot,
} from "./german.js";

export type ValencyCase = {
	readonly set: KnowledgeSetName;
	readonly goldCase: KnowledgeCase;
	readonly coverage: "Authored" | "ReviewedEmpty";
	/** Gold's frame, empty when reviewed empty. */
	readonly frame: readonly ProposedSlot[];
	readonly context: FrameContext;
};

/** A Dumrel complement as Luna proposes it. */
function proposedOf(
	complement: Dumrel.GermanValencyComplement,
): ProposedComplement {
	if (complement.kind === "Preposition")
		return {
			...complement,
			preposition: complement.preposition.canonicalForm,
		};
	if (complement.kind === "Reflexive" && complement.preposition)
		return {
			...complement,
			preposition: complement.preposition.canonicalForm,
		};
	return complement as ProposedComplement;
}

/** A German gold frame as Luna proposes it. */
const proposedFrame = (frame: readonly Dumrel.ValencySlot[]): ProposedSlot[] =>
	frame.map((slot) => ({
		status: slot.status,
		complements: slot.complements.map((complement) =>
			proposedOf(complement as Dumrel.GermanValencyComplement),
		),
	}));

const contextOf = (goldCase: KnowledgeCase): FrameContext => ({
	verb: goldCase.reading.lemma.kind === "VERB",
});

/** The valency-covered cases of the frozen sets named. */
export async function valencyCases(
	sets: readonly KnowledgeSetName[] = ["dev", "heldout"],
): Promise<ValencyCase[]> {
	const cases: ValencyCase[] = [];
	for (const set of sets) {
		const frozen = await loadKnowledgeSet(trackedKnowledgeSetsRoot, set);
		for (const goldCase of frozen.cases) {
			const coverage = goldCase.gold?.coverage.valency;
			if (coverage === undefined) continue;
			cases.push({
				set,
				goldCase,
				coverage,
				frame:
					coverage === "Authored"
						? proposedFrame(goldCase.gold?.knowledge.valency ?? [])
						: [],
				context: contextOf(goldCase),
			});
		}
	}
	return cases;
}
