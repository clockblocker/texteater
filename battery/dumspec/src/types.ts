import type * as Dumling from "dumling/types";

/**
 * A Spec Record's path under `records/`, without `.json`: `de/pass-auf-dich-auf`.
 * The first part is the record's language.
 */
export type SpecRecordId = string;

/**
 * An ADR: `ADR-0035` for a system ADR in `docs/adr/`, `dumgen/ADR-0002` for
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

export interface Sources {
	adrs: readonly AdrId[];
	rules: readonly RuleCitation[];
	references: readonly Reference[];
}

export type Provenance =
	| { kind: "Authored" }
	| { kind: "Quoted"; work: string; author: string; year: number };

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
