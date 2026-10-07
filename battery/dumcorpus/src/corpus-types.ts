/**
 * The types of dumcorpus's records, Rules and citing prompts. The
 * `dumcorpus/types` entry re-exports the ones other workspaces name.
 */
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

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

type SegmentKind =
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

/** A target's route: its language, Family and Kind. */
export type SpecRoute = Pick<Dumling.UnitRoute, "language" | "family" | "kind">;

/**
 * One target's Segmentation: the Segment each of its members is, in sentence
 * order, and its route. This is what `segment.inUnits` is scored on.
 */
export interface SegmentationTarget {
	memberSegmentIndices: readonly number[];
	route: SpecRoute;
	notes?: {
		rationale?: string;
		/** Analyses people or models get wrong here. */
		knownMistakes?: readonly string[];
	};
}

/**
 * Whether a person has covered one Knowledge aspect: Authored when the
 * Knowledge holds it, ReviewedEmpty when it was reviewed and has none.
 */
type CoverageStatus = "Authored" | "ReviewedEmpty";

/**
 * Which Knowledge aspects of a Reading a person has covered: one status per
 * aspect, per translation language and per semantic relation, as the
 * Authored Inventory records it. An aspect left out is unreviewed.
 */
export type KnowledgeCoverage = {
	readonly [Aspect in Exclude<
		keyof Dumrel.ReadingKnowledge,
		"translations" | "semanticRelations"
	>]?: CoverageStatus;
} & {
	readonly translations?: {
		readonly [Language in Dumrel.TranslationLanguage]?: CoverageStatus;
	};
	readonly semanticRelations?: {
		readonly [Relation in Dumrel.DirectSemanticRelation]?: CoverageStatus;
	};
};

/**
 * One target with its Attestation: a full Dumling Attestation whose Lemma has
 * the target's route. `memberSegmentIndices[i]` is the Segment of
 * `attestation.members[i]`.
 */
export interface SpecTarget extends SegmentationTarget {
	attestation: Dumling.Attestation;
	/**
	 * The Reading the target attests: the Attestation's Lemma with the
	 * authored Emoji Description, its identity (ADR 0031). Present when it
	 * passes its checks; a record reviewed through Reading names every one.
	 */
	reading?: Dumling.Reading;
	/**
	 * The Reading Knowledge the Reading owns, authored as `reading.knowledge`
	 * and checked against the Reading with dumrel. Typed Knowledge lives here;
	 * a record's `legacy` cases keep theirs verbatim until converted (#700).
	 */
	knowledge?: Dumrel.ReadingKnowledge;
	/**
	 * Which aspects of `knowledge` a person has covered, authored as
	 * `reading.coverage`. Present with the Knowledge it describes.
	 */
	coverage?: KnowledgeCoverage;
	/** The authored Grundform verdict, checked wherever Dumling can decide it. */
	grundform?: boolean;
}

/**
 * ResolvableText Segments with no defensible route, and why: one Segment, or
 * a nonce noun with the article it owns (`[der, Blarg]`), in sentence order.
 * `segment.inUnits` scores the entry as one `Unresolved` unit.
 */
export interface NoTarget {
	memberSegmentIndices: readonly number[];
	reason: string;
}

/** Full: every ResolvableText Segment is in exactly one target or No Target entry. */
export type Coverage = "Full" | "Partial";

/**
 * The parts of a sentence record's annotation a person reviews one at a
 * time, in order: each rests on the ones before it.
 */
export type AnnotationLayer =
	| "Segmentation"
	| "Attestation"
	| "Reading"
	| "Knowledge";

/** A Text Record is reviewed whole. */
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
interface Reference {
	title: string;
	url: string;
	supports: string;
}

/** What a record's annotation rests on. */
export interface Sources {
	adrs: readonly AdrId[];
	/**
	 * A record reviewed through any layer, or a Reviewed Text Record, cites at
	 * least one Rule; a Draft may cite none.
	 */
	rules: readonly RuleCitation[];
	references: readonly Reference[];
}

type Provenance =
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

/**
 * The review and validity of a sentence record's Annotation Layers. A layer
 * past `validThrough` fails a check or is missing; a layer past `reviewDepth`
 * is Draft.
 */
interface LayeredReview {
	/**
	 * The deepest Annotation Layer a person has reviewed, every layer before
	 * it included. Absent for a Draft.
	 */
	reviewDepth?: AnnotationLayer;
	/**
	 * The deepest Annotation Layer that passes its checks, every layer before
	 * it included. Never shallower than `reviewDepth`.
	 */
	validThrough: AnnotationLayer;
}

/**
 * One sentence of the golden corpus at its Segmentation layer (ADR 0037):
 * every record whose Segmentation passes, whatever its deeper layers hold.
 */
export interface SpecSegmentation extends LayeredReview {
	id: SpecRecordId;
	language: Dumling.Language;
	sentence: string;
	segments: readonly Segment[];
	targets: readonly SegmentationTarget[];
	noTarget: readonly NoTarget[];
	coverage: Coverage;
	sources: Sources;
	provenance: Provenance;
	legacy?: readonly LegacyCase[];
}

/**
 * One sentence of the golden corpus with its Attestations (ADR 0037): a
 * record whose Attestation layer passes as well.
 */
export interface SpecRecord extends Omit<SpecSegmentation, "targets"> {
	targets: readonly SpecTarget[];
}

/**
 * A Breakdown Record's path under `records/`, without `.json`:
 * `breakdown/de/den-faden-verlieren`. The second part is its language.
 */
export type BreakdownRecordId = string;

/**
 * One multiword Lemma's Breakdown (ADR 0041), the gold for `segment.inLexemes`
 * (Dumgen ADR 0007): the Lemma's wording as its sentence, segmented, and
 * the Lexeme targets it breaks down into. No target covers the whole
 * wording, and every ResolvableText Segment is in exactly one target.
 */
export interface BreakdownRecord extends LayeredReview {
	id: BreakdownRecordId;
	language: Dumling.Language;
	/** The Locution or Saying broken down. */
	lemma: Dumling.Lemma;
	/** The Lemma's Canonical Form. */
	sentence: string;
	segments: readonly Segment[];
	targets: readonly SpecTarget[];
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

/** A classification Rule (ADR 0037). */
export interface Rule {
	id: RuleId;
	/**
	 * Written for people. Changing it reopens every Reviewed record and prompt
	 * paragraph citing it.
	 */
	statement: string;
	/**
	 * Why the statement needs more than 600 characters, such as a table whose
	 * cells need listing. A longer statement without one draws a warning,
	 * since boundary cases belong in the Rule's records (ADR 0037).
	 */
	longStatement?: string;
	adrs: readonly AdrId[];
	/** Empty when the Rule applies to every route of its language. */
	routes: readonly SpecRoute[];
	/**
	 * Records that show the Rule, minimal pairs included. Empty while the Rule
	 * still needs one.
	 */
	records: readonly SpecRecordId[];
}

/** One paragraph of a prompt and the Rules it implements. */
interface ParagraphCitation {
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
