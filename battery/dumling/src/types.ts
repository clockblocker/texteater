import type { ParsingError } from "common-utils/validation";

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
	UnitMap,
	UnitRoute,
	VariantTag,
} from "./generated/units.js";
export type ParseResult<T> =
	| { success: true; chain: T }
	| { success: false; error: ParsingError };
