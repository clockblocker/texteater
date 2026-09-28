import type * as Dumling from "dumling/types";

export type {
	AuthoredMember,
	AuthoredRealization,
	AuthoredSpelling,
	ReviewedMember,
	SurfaceCell,
} from "./inventories.js";

/**
 * A Spec Record's path under `records/`, without `.json`: `de/pass-auf-dich-auf`.
 * The first part is the record's language.
 */
export type SpecRecordId = string;

/**
 * An ADR: `ADR-0035` for a system ADR in `docs/adr/`, `dumgen/ADR-0007` for
 * one scoped to an app or battery.
 */
export type AdrId = string;

/** `<language>/<kebab-case name>`: `de/noun-owns-its-article`. */
export type RuleId = string;

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

/**
 * One Segment of the sentence, as Dumgen's intake produces it. A fused word is
 * one Segment per component, and `surface` names the word a piece stands for
 * (`m` in `im` stands for `dem`).
 */
export interface Segment {
	kind: SegmentKind;
	text: string;
	surface?: string;
}

/**
 * One target: a full Dumling Attestation and the Segment each of its members
 * is. `memberSegmentIndices[i]` is the Segment of `attestation.members[i]`,
 * in sentence order.
 */
export interface SpecTarget {
	attestation: Dumling.Attestation;
	memberSegmentIndices: readonly number[];
	/**
	 * The Reading the target attests: the Attestation's Lemma with the
	 * authored Emoji Description, its identity (ADR 0031). A Reviewed target
	 * names it; a Draft may not yet.
	 */
	reading?: Dumling.Reading;
	/** The authored Grundform verdict, checked wherever Dumling can decide it. */
	grundform?: boolean;
	notes?: {
		rationale?: string;
		/** Analyses people or models get wrong here. */
		knownMistakes?: readonly string[];
	};
}

/** A ResolvableText Segment with no defensible route, and why. */
export interface NoTarget {
	segment: number;
	reason: string;
}

/** Full: every ResolvableText Segment is in exactly one target or No Target entry. */
export type Coverage = "Full" | "Partial";

export type ReviewStatus = "Draft" | "Reviewed";

/**
 * A Rule as it read when the citing record was reviewed, or when the citing
 * prompt paragraph was last checked against it.
 */
export interface RuleCitation {
	rule: RuleId;
	/** `ruleStatementHash` of the Rule's statement at review time. */
	hash: string;
}

/** An outside source, such as a dictionary entry or treebank. */
export interface Reference {
	title: string;
	url: string;
	supports: string;
}

/** What a record's annotation rests on. */
export interface Sources {
	adrs: readonly AdrId[];
	/** A Reviewed record cites at least one Rule; a Draft may cite none. */
	rules: readonly RuleCitation[];
	references: readonly Reference[];
}

export type Provenance =
	| { kind: "Authored" }
	| { kind: "Quoted"; work: string; author: string; year: number };

/**
 * A Dumgen case imported verbatim (ADR 0037), kept until it is reshaped into
 * typed fields. A record holding one stays on the worklist.
 */
export interface LegacyCase {
	/** The file the case came from, relative to the repository root. */
	source: string;
	caseId: string;
	/** The Segments the case marked, when it marked some. */
	memberSegmentIndices?: readonly number[];
	case: unknown;
}

/** One sentence of the golden corpus (ADR 0037). */
export interface SpecRecord {
	id: SpecRecordId;
	language: Dumling.Language;
	sentence: string;
	segments: readonly Segment[];
	targets: readonly SpecTarget[];
	noTarget: readonly NoTarget[];
	coverage: Coverage;
	status: ReviewStatus;
	sources: Sources;
	provenance: Provenance;
	legacy?: readonly LegacyCase[];
}

/**
 * A Breakdown Record's path under `records/`, without `.json`:
 * `breakdown/de/den-faden-verlieren`. The second part is its language.
 */
export type BreakdownRecordId = string;

/**
 * One multiword Lemma's Breakdown (ADR 0041), the gold for `Segment.Unit`
 * (Dumgen ADR 0007): the Lemma's wording as its sentence, segmented, and
 * the Lexeme targets it breaks down into. No target covers the whole
 * wording, and every ResolvableText Segment is in exactly one target.
 */
export interface BreakdownRecord {
	id: BreakdownRecordId;
	language: Dumling.Language;
	/** The Locution or Saying broken down. */
	lemma: Dumling.Lemma;
	/** The Lemma's Canonical Form. */
	sentence: string;
	segments: readonly Segment[];
	targets: readonly SpecTarget[];
	status: ReviewStatus;
	sources: Sources;
}

/**
 * Raw text as a reader supplies it, before intake makes a sentence of it.
 * Its path under `records/`, `text/<name>`, is its id.
 */
export interface TextRecord {
	id: string;
	sourceText: string;
	status: ReviewStatus;
	/** A Reviewed Text Record cites at least one Rule; a Draft may omit it. */
	sources?: Sources;
	legacy?: readonly LegacyCase[];
}

export type RuleRoute = Pick<Dumling.UnitRoute, "language" | "family" | "kind">;

/** A classification Rule (ADR 0037). */
export interface Rule {
	id: RuleId;
	/**
	 * Written for people. Changing it reopens every Reviewed record and prompt
	 * paragraph citing it.
	 */
	statement: string;
	adrs: readonly AdrId[];
	/** Empty when the Rule applies to every route of its language. */
	routes: readonly RuleRoute[];
	/**
	 * Records that show the Rule, minimal pairs included. Empty while the Rule
	 * still needs one.
	 */
	records: readonly SpecRecordId[];
}

/** One paragraph of a prompt and the Rules it implements. */
export interface ParagraphCitation {
	/** The paragraph's first words, which find it in the prompt text. */
	opens: string;
	implements: readonly RuleCitation[];
}

/**
 * A prompt text that implements Rules, such as Dumgen's classification
 * criteria. Its paragraphs are its lines, each citing the Rules it implements
 * with the statement hash it was last checked against.
 */
export interface CitingPrompt {
	name: string;
	text: string;
	paragraphs: readonly ParagraphCitation[];
}
