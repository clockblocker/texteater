/**
 * The Knowledge gold the valency notation is checked and benched on: every
 * case of the dev and held-out sets whose gold covers valency, its realized
 * concrete pattern in Luna's proposal shape (a preposition is its Canonical
 * Form).
 */
import type * as Dumrel from "dumrel/types";
import {
	type PatternContext,
	type ProposedPattern,
	proposedComplementOf,
} from "../../../src/knowledge/de/valency-notation.js";
import {
	type KnowledgeCase,
	type KnowledgeSetName,
	knowledgeCases,
} from "../knowledge/cases.js";

export type ValencyCase = {
	readonly set: KnowledgeSetName;
	readonly goldCase: KnowledgeCase;
	readonly coverage: "Authored" | "ReviewedEmpty";
	/** Gold's concrete realized pattern, empty when reviewed empty. */
	readonly pattern: ProposedPattern;
	readonly context: PatternContext;
};

/** A German gold pattern as Luna proposes it. */
const proposedPattern = (
	pattern: Dumrel.ValencyPattern | undefined,
): ProposedPattern =>
	(pattern ?? []).map((complement) =>
		proposedComplementOf(complement as Dumrel.GermanValencyComplement),
	);

const contextOf = (goldCase: KnowledgeCase): PatternContext => ({
	verb: goldCase.reading.lemma.kind === "VERB",
});

/** The valency-covered cases of the live corpus sets named. */
export async function valencyCases(
	sets: readonly KnowledgeSetName[] = ["dev", "heldout"],
): Promise<ValencyCase[]> {
	const split = knowledgeCases();
	const bySet: Partial<Record<KnowledgeSetName, readonly KnowledgeCase[]>> = {
		dev: split.dev,
		heldout: split.heldout,
	};
	const cases: ValencyCase[] = [];
	for (const set of sets) {
		for (const goldCase of bySet[set] ?? []) {
			const coverage = goldCase.gold?.coverage.valency;
			if (coverage === undefined) continue;
			cases.push({
				set,
				goldCase,
				coverage,
				pattern:
					coverage === "Authored"
						? proposedPattern(goldCase.gold?.knowledge.valency?.[0])
						: [],
				context: contextOf(goldCase),
			});
		}
	}
	return cases;
}
