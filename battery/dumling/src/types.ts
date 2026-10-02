import type { ParsingError } from "dumval/runtime";

export type {
	Attestation,
	Family,
	Kind,
	Language,
	Lemma,
	ParsedUnit,
	Reading,
	Surface,
	Syncretism,
	SyncretismView,
	SyncretizableUnitKind,
	Unit,
	UnitKind,
	UnitRoute,
	VariantTag,
} from "./generated/units.js";
export type { GrundformIssue, GrundformResult } from "./grundform/result.js";
export type ParseResult<T> =
	| { success: true; chain: T }
	| { success: false; error: ParsingError };
