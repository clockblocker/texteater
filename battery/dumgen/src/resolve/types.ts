/**
 * What `resolve.grammar` and `resolve.reading` take and return (#859).
 * Grammar takes the stored unit a click landed on, the Sentence and its
 * neighbours, and the stored Lemmas that may name it; out comes the
 * unit's Attestation, or the judge's Unresolved, or a Catalog Miss.
 * Reading takes that Attestation, the stored Emoji Descriptions of its
 * Lemma and the one Grammar drafted; out comes a Reuse, a New or a Catalog
 * Miss. All are answers; the
 * error channel says only that no usable answer came back.
 */
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
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
	/**
	 * Told once what jev judged of an open-route click, as soon as its
	 * first request is answered and while Luna may still be writing the
	 * headword (#1326). It runs beside the rest of the click, which waits
	 * for it before it returns; it cannot fail the click.
	 */
	readonly onJudged?: (judged: JudgedGrammar) => Effect.Effect<void>;
};

/**
 * What `resolve.grammar` has judged of an open-route click before its
 * headword is written: the route and jev's answers to the first request,
 * read as the Attestation will hold them, with no Canonical Form and no
 * normalized Surface. `pending` names what the headword may still change:
 * a common NOUN's gender follows the article Luna writes with its
 * headword, and its Case is asked over the cells that gender leaves.
 */
export type JudgedGrammar = {
	readonly route: Route;
	readonly coreFeatures: Readonly<Record<string, unknown>>;
	/** Null where the route inflects but this form shows nothing; absent where it never inflects. */
	readonly inflectionalFeatures?: Readonly<Record<string, unknown>> | null;
	readonly surfaceFeatures: Dumling.Surface<"de">["surfaceFeatures"];
	readonly spelling: Dumling.Surface<"de">["spelling"];
	/** Each member's Segment and orthography, in member order. */
	readonly members: readonly {
		readonly segment: number;
		readonly orthography: Dumling.Attestation<"de">["members"][number]["orthography"];
	}[];
	readonly realizationCoverage: "Full" | "Partial";
	readonly pending: readonly ("gender" | "case")[];
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
			/**
			 * The Emoji Description Luna drafted, for `resolve.reading`'s
			 * `drafted`: in the Canonical Form call, or, where code wrote the
			 * headword of a Lemma with no stored or authored Reading, alone
			 * beside jev (ADR 0031). Absent where `resolve.reading` writes
			 * none, where nothing was drafted, or where the draft is no Emoji
			 * Description.
			 */
			readonly drafted?: string;
	  }
	| { readonly _tag: "Unresolved" }
	| {
			readonly _tag: "CatalogMiss";
			readonly route: Route;
			readonly message: string;
	  };

/**
 * What `resolve.reading` takes (#859): the Attestation `resolve.grammar`
 * returned, the Sentence and the stored unit it resolved, and the Emoji
 * Descriptions of the Lemma's stored Readings. The unit only marks the
 * target in the Sentence.
 */
export type ResolveReadingInput = {
	readonly attestation: Dumling.Attestation<"de">;
	/** Dumgen's own Segmented Sentence, as intake stored it; never a failed one. */
	readonly sentence: SegmentedSentence;
	/** The stored unit the Attestation resolves. */
	readonly unit: Unit;
	/** The Emoji Descriptions of the Lemma's stored Readings, as stored. */
	readonly candidates: readonly string[];
	/**
	 * The candidates whose stored Valency Frame has an Optional Reflexive
	 * Slot, as `(sich) ausruhen` has (ADR 0052): a click whose members hold
	 * a lexical reflexive is offered them beside the 🪞 Readings. A Reading
	 * Knowledge has given no frame yet is not among them, so its 🪞 alone
	 * decides whether it is offered.
	 */
	readonly optionallyReflexive?: readonly string[];
	/**
	 * The Emoji Description Luna wrote for this click before the host
	 * refused its New as stale (ADR 0031): the judge runs again over the
	 * current candidates, and a second NoMatch takes this one instead of
	 * writing another.
	 */
	readonly written?: string;
	/**
	 * The Emoji Description `resolve.grammar` drafted for this click. Only
	 * the judge's NoMatch, or no stored Reading to judge, lets it stand,
	 * where Luna would otherwise write one; never the stored descriptions
	 * shaped it (ADR 0031).
	 */
	readonly drafted?: string;
};

/**
 * The Reading's answer: a stored candidate the click reuses, as stored, or
 * a New Emoji Description, which Luna wrote or an authored Reading names
 * (ADR 0021), or a Catalog Miss when a Closed Route's Lemma has no
 * authored Reading. tf-demo recognizes an authored Reading by its value.
 */
export type ReadingResolution =
	| { readonly _tag: "Reuse"; readonly emojiDescription: string }
	| { readonly _tag: "New"; readonly emojiDescription: string }
	| {
			readonly _tag: "CatalogMiss";
			readonly route: Route;
			readonly message: string;
	  };
