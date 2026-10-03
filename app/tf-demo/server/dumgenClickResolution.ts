import type {
	Dumgen,
	ReadingResolution as DumgenReading,
	GrammarResolution,
	SegmentedSentence,
	Unit,
} from "dumgen";
import * as Effect from "effect/Effect";
import type {
	ClickReadingInput,
	ClickResolution,
	ClickSentence,
	ReadingResolution,
} from "./clickResolution";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";

/** The stored Sentence as Dumgen's Segmented Sentence, with the one unit a click resolves. */
function dumgenSentence(
	sentence: ClickSentence,
	unit: Unit,
): SegmentedSentence {
	return {
		text: sentence.segments.map(({ text }) => text).join(""),
		segments: sentence.segments.map(({ kind, text }) => ({ kind, text })),
		units: [unit],
	};
}

/**
 * The ClickResolution whose halves are Dumgen's `resolve.grammar` (#876)
 * and `resolve.reading` (#877). Grammar: the stored unit under the click
 * goes in, with the Sentence, its neighbours and the stored Lemmas found
 * under its words, and the Attestation, Unresolved or Catalog Miss comes
 * back as an answer. The clicked Segment stays tf-demo's Segment Selection;
 * Dumgen sees the unit. A click on a Segment with no stored unit resolves
 * nothing. Reading: the Attestation and the Emoji Descriptions of its
 * Lemma's stored Readings go in, and a Reuse, a New or a Catalog Miss comes
 * back; a New carries the candidates its judge saw, so the commit can
 * refuse it once stale (ADR 0031). `dumgen` builds the instance when a
 * click first needs it.
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
					sentence: dumgenSentence(input.sentence, stored),
					unit: stored,
					neighbours: input.neighbours,
					lemmaCandidates: input.lemmaCandidates,
				}),
			).pipe(
				Effect.map((result) => clickGrammarOf(result, input, stored)),
			);
		},
		reading: (input) => {
			const { encounter, attestation } = input.grammar;
			const unit = {
				segments: [...encounter.target.memberSegmentIndices],
				route: {
					language: "de",
					family: encounter.target.family,
					kind: encounter.target.kind,
				},
			} as Unit;
			return Effect.suspend(() =>
				dumgen().resolve.reading({
					attestation,
					sentence: dumgenSentence(encounter.sentence, unit),
					unit,
					candidates: input.candidates,
					...(input.written === undefined
						? {}
						: { written: input.written }),
				}),
			).pipe(Effect.map((result) => clickReadingOf(result, input)));
		},
	});
}

/** Dumgen's Reading as the orchestrator commits it; a New keeps the candidates its judge saw. */
function clickReadingOf(
	result: DumgenReading,
	input: ClickReadingInput,
): ReadingResolution | CatalogMissSignal {
	if (result._tag === "CatalogMiss")
		return {
			decision: "CatalogMiss",
			stage: "resolve.reading",
			route: `de/${result.route.family}/${result.route.kind}`,
			message: result.message,
		};
	return result._tag === "Reuse"
		? { decision: "Reuse", emojiDescription: result.emojiDescription }
		: {
				decision: "New",
				emojiDescription: result.emojiDescription,
				candidates: [...input.candidates],
			};
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
