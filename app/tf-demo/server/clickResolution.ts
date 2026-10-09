import type { InvalidModelOutput, ProviderFailure } from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
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
 * Production runs Dumgen's `resolve.grammar` and `resolve.reading`
 * (`dumgenClickResolution`).
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

/**
 * Reuse names a stored Reading's Emoji Description; New makes one. A Foreign
 * Reading has none (ADR 0045).
 */
export type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription?: string;
	/**
	 * For a New: the stored Emoji Descriptions its judge saw. The commit
	 * refuses the New once the Lemma has gained a Reading outside them, and
	 * the judge runs again (ADR 0031). Absent where no judge took part.
	 */
	readonly candidates?: readonly string[];
};

export type ClickReadingInput = {
	readonly grammar: ResolvedGrammar;
	readonly lemma: Dumling.Lemma<"de">;
	/** The Emoji Descriptions of the Lemma's stored Readings. */
	readonly candidates: readonly string[];
	/**
	 * The Emoji Description this click wrote before its commit refused the
	 * New as stale: the judge runs again over `candidates`, and a second
	 * NoMatch keeps this one (ADR 0031).
	 */
	readonly written?: string;
	/**
	 * The Emoji Description Grammar drafted: it stands in for the one Luna
	 * would write once the judge finds no stored Reading (ADR 0031).
	 */
	readonly drafted?: string;
};

/**
 * Unresolved and Catalog Miss are answers; the error channel only says that
 * no usable answer came back (#859).
 */
export type ClickResolution = {
	readonly grammar: (
		input: ClickGrammarInput,
	) => Effect.Effect<ClickGrammar, ProviderFailure | InvalidModelOutput>;
	readonly reading: (
		input: ClickReadingInput,
	) => Effect.Effect<
		ReadingResolution | CatalogMissSignal,
		ProviderFailure | InvalidModelOutput
	>;
};
