/**
 * What the record server sends the review page. The server reads the Spec
 * Records and the batch; the page only renders these views and posts
 * approvals back.
 */
import type { SpecIssue } from "dumspec";
import type * as Dumspec from "dumspec/types";

export type Split = "held-out" | "dev";

/** A question on a GitHub issue that must be ruled before a row is approved. */
export interface OpenQuestion {
	issue: number;
	question: number;
	url: string;
}

/** One batch row as the list shows it. */
export interface BatchRowView {
	row: string;
	record: Dumspec.SpecRecordId;
	bucket: string;
	split: Split;
	change: string;
	consistencySets: readonly string[];
	openQuestion?: OpenQuestion;
	sentence?: string;
	reviewDepth?: Dumspec.AnnotationLayer;
	validThrough?: Dumspec.AnnotationLayer;
	/** Whether git sees the file changed; null outside a git work tree. */
	dirty: boolean | null;
	/** Why the batch forbids approving the row, whatever the record holds. */
	blocked?: string;
	/** Why the file cannot be read as a record. */
	problem?: string;
}

export interface BatchView {
	path: string;
	note?: string;
	rows: readonly BatchRowView[];
}

export type IssueView = Omit<SpecIssue, "record">;

/** One target as the Segmentation layer sees it. */
export interface UnitView {
	memberSegmentIndices: readonly number[];
	route: { family: string; kind: string };
	rationale?: string;
	/** The draft Attestation's Lemma, a hint only at this depth. */
	lemmaHint?: string;
}

export type CitationStatus = "current" | "stale" | "unknown";

export interface RuleCitationView {
	rule: Dumspec.RuleId;
	hash: string;
	status: CitationStatus;
}

/** Whether an action is open, and why not. */
export interface ActionView {
	allowed: boolean;
	reason?: string;
}

interface RecordHead {
	id: Dumspec.SpecRecordId;
	row: BatchRowView;
	/** The file's sha256, sent back with a save. */
	sha256?: string;
	dirty: boolean | null;
}

/** A record file that parses as a Spec Record. */
export interface ReadableRecordView extends RecordHead {
	status: "readable";
	sha256: string;
	sentence: string;
	segments: readonly Dumspec.Segment[];
	coverage: Dumspec.Coverage;
	reviewDepth?: Dumspec.AnnotationLayer;
	validThrough?: Dumspec.AnnotationLayer;
	units: readonly UnitView[];
	noTarget: readonly Dumspec.NoTarget[];
	/** Checks of the whole record: id, shape, Rule citation. */
	recordIssues: readonly IssueView[];
	segmentationIssues: readonly IssueView[];
	/** Attestation, Reading and Knowledge issues. */
	deeperIssues: readonly IssueView[];
	rules: readonly RuleCitationView[];
	approve: ActionView;
	takeBack: ActionView;
}

/** A record file that is missing, is not JSON, or fails the record shape. */
interface UnreadableRecordView extends RecordHead {
	status: "unreadable";
	problem: string;
	recordIssues: readonly IssueView[];
}

export type RecordView = ReadableRecordView | UnreadableRecordView;

/** The body of a save: the record and the hash its edit was based on. */
export interface SaveRequest {
	id: Dumspec.SpecRecordId;
	sha256: string;
}

/**
 * A save's answer. `conflict` (409) carries the record as it is on disk now;
 * `refused` (422) says why nothing was written.
 */
export type SaveResponse =
	| { outcome: "saved"; record: RecordView }
	| { outcome: "conflict"; record: RecordView; error: string }
	| { outcome: "refused"; error: string };
