import type {
	ReadingResolution as DumgenReading,
	GrammarResolution,
	InvalidModelOutput,
	ProviderFailure,
	ResolveGrammarInput,
	ResolveReadingInput,
	SegmentedSentence,
	Unit,
} from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import {
	type ClickGrammarInput,
	type ClickGrammarSentence,
	type ClickReadingInput,
	type ClickResolution,
	type ClickSentence,
	type ReadingResolution,
	routedUnit,
} from "./clickResolution";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import type { StoredUnit } from "./storedSegments";

type ModelFailure = ProviderFailure | InvalidModelOutput;

/** Dumgen's click operations, `operations.resolve`, needing `R`. */
export type ClickDumgen<R> = {
	readonly resolve: {
		readonly grammar: (
			input: ResolveGrammarInput,
		) => Effect.Effect<GrammarResolution, ModelFailure, R>;
		readonly reading: (
			input: ResolveReadingInput,
		) => Effect.Effect<DumgenReading, ModelFailure, R>;
	};
};

/**
 * The stored Sentence as Dumgen's Segmented Sentence: for Grammar, with
 * every unit intake stored and the word each Segment stands for; for
 * Reading, with the one unit it marks.
 */
function dumgenSentence(
	sentence: ClickGrammarSentence,
	units: readonly Unit[],
): SegmentedSentence {
	return {
		text: sentence.segments.map(({ text }) => text).join(""),
		segments: sentence.segments.map(({ kind, text, surface }) => ({
			kind,
			text,
			...(surface === undefined ? {} : { surface }),
		})),
		units: [...units],
	};
}

/** A stored unit as Dumgen's: its Segments, route and closed-class identity. */
const dumgenUnit = (unit: StoredUnit): Unit =>
	({
		segments: [...unit.segments],
		route: unit.route === "Unresolved" ? "Unresolved" : { ...unit.route },
		...(unit.identity ? { identity: { ...unit.identity } } : {}),
	}) as Unit;

/**
 * What Dumgen's `resolve.grammar` takes for a click, but its `onJudged`:
 * the stored unit under the click, among the Sentence's others as intake
 * stored them, the neighbours and the stored Lemmas found under its words;
 * none for a click on a Segment with no routed unit. A batch that asks a
 * click's Luna request ahead builds it the same way (#1351).
 */
export function dumgenGrammarInput(
	input: ClickGrammarInput,
): ResolveGrammarInput | undefined {
	const unit = routedUnit(input.unit);
	if (!unit) return undefined;
	const stored = dumgenUnit(unit);
	// The clicked unit among the Sentence's others, as intake stored them.
	const units = input.units.some(
		({ segments }) =>
			segments.length === stored.segments.length &&
			segments.every((index, at) => index === stored.segments[at]),
	)
		? input.units.map(dumgenUnit)
		: [stored];
	return {
		language: "de",
		sentence: dumgenSentence(input.sentence, units),
		unit: stored,
		neighbours: input.neighbours,
		lemmaCandidates: input.lemmaCandidates,
	};
}

/**
 * The ClickResolution whose halves are Dumgen's `resolve.grammar` (#876)
 * and `resolve.reading` (#877). Grammar: the stored unit under the click
 * goes in, with the Sentence and its other units, its neighbours and the stored Lemmas found
 * under its words, and the Attestation, Unresolved or Catalog Miss comes
 * back as an answer. The clicked Segment stays tf-demo's Segment Selection;
 * Dumgen sees the unit. A click on a Segment with no stored unit resolves
 * nothing; Luna's draft of the Emoji Description comes back with the
 * Attestation, and what jev judged reaches `onJudged` before Luna's
 * headword does. Reading: the Attestation, the Emoji Descriptions of its
 * Lemma's stored Readings and the draft go in, and a Reuse, a New or a
 * Catalog Miss comes back; a New carries the candidates its judge saw, so the commit can
 * refuse it once stale (ADR 0031). `dumgen` hands over the operations
 * when a click first needs them: in production `operations`, needing
 * `Jev | Luna`, once the deployment's key is checked.
 * `optionallyReflexive` finds, in stored Knowledge, the Lemma's Readings
 * whose Reflexive Slot is Optional; only a click whose Attestation holds a
 * lexical reflexive asks, and the judge is offered them beside the 🪞
 * Readings (ADR 0052).
 */
export function dumgenClickResolution<R>(
	dumgen: () => ClickDumgen<R>,
	optionallyReflexive: (
		lemma: Dumling.Lemma<"de">,
	) => Promise<readonly string[]> = async () => [],
): ClickResolution<R> {
	return Object.freeze({
		grammar: (input, onJudged) => {
			// Dumgen answers a unit intake left Unresolved with no call (#861).
			const grammar = dumgenGrammarInput(input);
			if (!grammar)
				return Effect.succeed({
					decision: "Unresolved" as const,
					language: "de" as const,
				});
			// Handed over when a click needs it, so a click that reuses a
			// committed occurrence needs no model key.
			return Effect.suspend(() =>
				dumgen().resolve.grammar({
					...grammar,
					...(onJudged ? { onJudged } : {}),
				}),
			).pipe(
				Effect.map((result) =>
					clickGrammarOf(result, input, grammar.unit),
				),
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
			return (
				holdsReflexive(attestation)
					? Effect.promise(() => optionallyReflexive(input.lemma))
					: Effect.succeed([])
			).pipe(
				Effect.flatMap((optional) =>
					dumgen().resolve.reading({
						attestation,
						sentence: dumgenSentence(encounter.sentence, [unit]),
						unit,
						candidates: input.candidates,
						...(optional.length > 0
							? { optionallyReflexive: optional }
							: {}),
						...(input.written === undefined
							? {}
							: { written: input.written }),
						...(input.drafted === undefined
							? {}
							: { drafted: input.drafted }),
					}),
				),
				Effect.map((result) => clickReadingOf(result, input)),
			);
		},
	});
}

/** Whether an Attestation's valency evidence names a lexical reflexive (ADR 0052). */
const holdsReflexive = (attestation: Dumling.Attestation<"de">) =>
	"valencyEvidence" in attestation &&
	attestation.valencyEvidence.some(
		({ complement }) => complement.kind === "Reflexive",
	);

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

/** The Encounter's Sentence: each Segment's kind and text, as its checkpoint keeps them. */
function encounterSentence(sentence: ClickGrammarSentence): ClickSentence {
	return {
		...sentence,
		segments: sentence.segments.map(({ kind, text }) => ({ kind, text })),
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
			sentence: encounterSentence(input.sentence),
			target: {
				family: lemma.family,
				kind: lemma.kind,
				memberSegmentIndices: [...unit.segments],
			},
		},
		attestation: result.attestation,
		...(result.drafted === undefined ? {} : { drafted: result.drafted }),
	};
	return grammar;
}
