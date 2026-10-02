import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { ClickSentence } from "./clickEncounter";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import type { StoredUnit } from "./storedSegments";

export type { ClickEncounter, ClickSentence } from "./clickEncounter";

/**
 * The ClickResolution port: what a click on a stored Segment resolves
 * through once no occurrence owns it. Grammar names the clicked occurrence's
 * Attestation, and Reading picks a stored Reading's Emoji Description or
 * makes a new one. The orchestrator keeps reuse, checkpoints, commits and
 * conflicts on its side of the port.
 *
 * While resolution is rebuilt on the new Dumgen (#701), production runs
 * `selectUnitOnly`: a click selects its whole unit and resolves nothing, so
 * no Note is created and no model is called (#848).
 */

/** A stored Lemma and the Sentence texts it was found under. */
export type LemmaCandidate = {
	readonly lemma: Dumling.Lemma<"de">;
	readonly foundUnder: readonly string[];
};

/** The Sentences just before and after the clicked one, as far as they exist. */
export type NeighbourSentences = {
	readonly before?: string;
	readonly after?: string;
};

export type ClickGrammarInput = {
	readonly sentence: ClickSentence;
	readonly clickedSegmentIndex: number;
	/** The biggest unit intake stored at the clicked Segment, if any. */
	readonly unit?: StoredUnit;
	readonly lemmaCandidates: readonly LemmaCandidate[];
	readonly neighbours: NeighbourSentences;
};

type UnresolvedGrammar = {
	readonly decision: "Unresolved";
	readonly language: "de";
};

type ClickGrammar = ResolvedGrammar | UnresolvedGrammar | CatalogMissSignal;

/** Reuse names a stored Reading's Emoji Description; New makes one. */
export type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};

export type ClickReadingInput = {
	readonly grammar: ResolvedGrammar;
	readonly lemma: Dumling.Lemma<"de">;
	/** The Emoji Descriptions of the Lemma's stored Readings. */
	readonly candidates: readonly string[];
};

export type ClickResolution = {
	readonly grammar: (
		input: ClickGrammarInput,
	) => Effect.Effect<ClickGrammar, unknown>;
	readonly reading: (
		input: ClickReadingInput,
	) => Effect.Effect<ReadingResolution | CatalogMissSignal, unknown>;
};

/**
 * The production stub while resolution is rebuilt (#848): a click selects
 * its whole stored unit, whose words, route and variants the Resolution
 * Note shows, and resolves no Attestation or Reading. It calls no model.
 */
export const selectUnitOnly: ClickResolution = Object.freeze({
	grammar: () =>
		Effect.succeed({
			decision: "Unresolved" as const,
			language: "de" as const,
		}),
	reading: () =>
		Effect.die(
			new Error(
				"No Reading is resolved while click resolution is rebuilt.",
			),
		),
});
