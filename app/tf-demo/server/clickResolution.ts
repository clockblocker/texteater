import type {
	InvalidModelOutput,
	JudgedGrammar,
	ProviderFailure,
} from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
import type { ClickSentence } from "./clickEncounter";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import type { StoredSegment, StoredUnit } from "./storedSegments";

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

/** A stored unit intake gave a route. */
export type RoutedUnit = Omit<StoredUnit, "route"> & {
	readonly route: Exclude<StoredUnit["route"], "Unresolved">;
};

/**
 * The clicked Segment's unit when intake routed it. Only a click on a routed
 * unit needs a model: with no unit, or one intake left Unresolved, a click
 * whose Sentence's segmentation stands is Unresolved (#861). Dumgen's
 * Grammar answers such a click at once, and Segment Selection settles it
 * before any run is scheduled.
 */
export function routedUnit(
	unit: StoredUnit | undefined,
): RoutedUnit | undefined {
	return unit === undefined || unit.route === "Unresolved"
		? undefined
		: (unit as RoutedUnit);
}

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

/**
 * The clicked Sentence as Grammar reads it: the Encounter's Sentence with
 * the word each piece or shortened word stands for, as intake chose it
 * (`'s` of `geht's`: `es`), so Dumgen does not ask again (#1329). The
 * Encounter Grammar names keeps only the Segments' kind and text.
 */
export type ClickGrammarSentence = Omit<ClickSentence, "segments"> & {
	readonly segments: readonly Pick<
		StoredSegment,
		"kind" | "text" | "surface"
	>[];
};

export type ClickGrammarInput = {
	readonly sentence: ClickGrammarSentence;
	readonly clickedSegmentIndex: number;
	/** The biggest unit intake stored at the clicked Segment, if any. */
	readonly unit?: StoredUnit;
	/**
	 * Every unit intake stored for the Sentence. Grammar reads the units
	 * around the clicked one: the determiner and the preposition its phrase
	 * opens with narrow an agreeing word's case (#1326, #1337).
	 */
	readonly units: readonly StoredUnit[];
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
 * Told once what jev judged of a click while Luna may still be writing its
 * headword (#1329): Dumgen's `onJudged`. Grammar waits for it before it
 * returns, so it only starts what it reports, and it cannot fail the click.
 */
export type OnJudged = (judged: JudgedGrammar) => Effect.Effect<void>;

/**
 * Unresolved and Catalog Miss are answers; the error channel only says that
 * no usable answer came back (#859). `R` is what the resolution needs:
 * Dumgen's `Jev | Luna` in production, which the click's action provides;
 * nothing for a test's fake.
 */
export type ClickResolution<R = never> = {
	readonly grammar: (
		input: ClickGrammarInput,
		onJudged?: OnJudged,
	) => Effect.Effect<ClickGrammar, ProviderFailure | InvalidModelOutput, R>;
	readonly reading: (
		input: ClickReadingInput,
	) => Effect.Effect<
		ReadingResolution | CatalogMissSignal,
		ProviderFailure | InvalidModelOutput,
		R
	>;
};
