import type { Dumgen, GrammarResolution, Unit } from "dumgen";
import * as Effect from "effect/Effect";
import { type ClickResolution, selectUnitOnly } from "./clickResolution";
import type { ResolvedGrammar } from "./resolutionGrammar";

/**
 * The ClickResolution whose grammar is Dumgen's `resolve.grammar` (#876):
 * the stored unit under the click goes in, with the Sentence, its
 * neighbours and the stored Lemmas found under its words, and the
 * Attestation, Unresolved or Catalog Miss comes back as an answer. The
 * clicked Segment stays tf-demo's Segment Selection; Dumgen sees the unit.
 * A click on a Segment with no stored unit resolves nothing. `dumgen`
 * builds the instance when a click first needs it.
 *
 * The Reading half stays the stub until Dumgen resolves Readings (#877).
 */
export function dumgenClickResolution(
	dumgen: () => Pick<Dumgen, "resolve">,
): ClickResolution {
	return Object.freeze({
		grammar: (input) => {
			const { unit } = input;
			// Dumgen answers a unit intake left Unresolved with no call (#861).
			if (!unit || unit.route === "Unresolved")
				return Effect.succeed({
					decision: "Unresolved" as const,
					language: "de" as const,
				});
			const stored: Unit = {
				segments: [...unit.segments],
				route: { ...unit.route },
				...(unit.identity ? { identity: { ...unit.identity } } : {}),
			} as Unit;
			// Built when a click needs it, so a click that reuses a committed
			// occurrence needs no model key.
			return Effect.suspend(() =>
				dumgen().resolve.grammar({
					language: "de",
					sentence: {
						text: input.sentence.segments
							.map(({ text }) => text)
							.join(""),
						segments: input.sentence.segments.map(
							({ kind, text }) => ({
								kind,
								text,
							}),
						),
						units: [stored],
					},
					unit: stored,
					neighbours: input.neighbours,
					lemmaCandidates: input.lemmaCandidates,
				}),
			).pipe(
				Effect.map((result) => clickGrammarOf(result, input, stored)),
			);
		},
		reading: selectUnitOnly.reading,
	});
}

/** Dumgen's answer as the orchestrator stores it, with the Encounter Grammar resolved. */
function clickGrammarOf(
	result: GrammarResolution,
	input: Parameters<ClickResolution["grammar"]>[0],
	unit: Unit,
) {
	if (result._tag === "Unresolved")
		return { decision: "Unresolved" as const, language: "de" as const };
	if (result._tag === "CatalogMiss")
		return {
			decision: "CatalogMiss" as const,
			stage: "resolve.grammar",
			route: `de/${result.route.family}/${result.route.kind}`,
			message: result.message,
		};
	const { lemma } = result.attestation.surface;
	const grammar: ResolvedGrammar = {
		decision: "Resolved",
		language: "de",
		encounter: {
			sentence: input.sentence,
			target: {
				family: lemma.family,
				kind: lemma.kind,
				memberSegmentIndices: [...unit.segments],
			},
		},
		attestation: result.attestation,
	};
	return grammar;
}
