/**
 * What `resolve.grammar` takes and returns (#859): the stored unit a click
 * landed on, the Sentence and its neighbours, and the stored Lemmas that
 * may name it; out comes the unit's Attestation, or the judge's
 * Unresolved, or a Catalog Miss. All three are answers; the error channel
 * says only that no usable answer came back.
 */
import type * as Dumling from "dumling/types";
import type {
	Route,
	SegmentedSentence,
	SegmentLanguage,
	Unit,
} from "../segment/segmented-sentence.js";

/**
 * A stored Lemma the host found under some text of the Sentence, and the
 * texts it was found under. Only one found under the unit's own words, on
 * the unit's route, reaches the Canonical Form call, as a hint.
 */
export type LemmaCandidate = {
	readonly lemma: Dumling.Lemma<"de">;
	readonly foundUnder: readonly string[];
};

/** The Sentences just before and after the clicked one, as far as they exist. */
export type NeighbourSentences = {
	readonly before?: string;
	readonly after?: string;
};

export type ResolveGrammarInput = {
	readonly language: SegmentLanguage;
	/** Dumgen's own Segmented Sentence, as intake stored it; never a failed one. */
	readonly sentence: SegmentedSentence;
	/** The stored unit, as intake returned it; the clicked Segment stays with the host. */
	readonly unit: Unit;
	/** Read only for a pronoun form whose cell its referent decides (ADR 0044). */
	readonly neighbours: NeighbourSentences;
	readonly lemmaCandidates: readonly LemmaCandidate[];
};

/**
 * The click's answer. Unresolved is the judge's verdict, or intake's, and
 * is never re-asked (ADR 0023). A Catalog Miss is a Closed Route whose
 * authored inventory lacks the unit (ADR 0021).
 */
export type GrammarResolution =
	| {
			readonly _tag: "Resolved";
			readonly attestation: Dumling.Attestation<"de">;
	  }
	| { readonly _tag: "Unresolved" }
	| {
			readonly _tag: "CatalogMiss";
			readonly route: Route;
			readonly message: string;
	  };
