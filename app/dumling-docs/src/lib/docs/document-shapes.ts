import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";

import type { Prettify } from "../../../helper-types";

export type DocPageMeta = {
	description?: string;
	navTitle?: string;
	order?: number;
	slug?: string;
	title: string;
};

export const generatedDocPageMarker = "generated-doc-page";
export const universalConceptPageMarker = "universal-concept-page";
export const languageOverlayPageMarker = "language-overlay-page";

/** One target of a dumspec Spec Record, shown as a page example. */
export type AttestedAttestation = Readonly<{
	attestation: Dumling.Attestation;
	record: Dumspec.SpecRecordId;
	/** The record's sentence with the target's members in brackets. */
	sentenceMarkdown: string;
	/** The target's index in the record. */
	target: number;
}>;

export type DocCitePageFamily =
	| "scope"
	| "entity"
	| "surface"
	| "kind"
	| "pos"
	| "morpheme"
	| "phraseme"
	| "feature"
	| "feature-attestation"
	| "feature-surface";

export type DocSection = {
	body?: string;
	examples?: readonly AttestedAttestation[];
	heading?: string;
};

type SharedTypedDocFields = DocSection & {
	meta: DocPageMeta;
	subsections?: readonly DocSection[];
};

export type GeneratedDocPageDocument = Prettify<
	SharedTypedDocFields & {
		[generatedDocPageMarker]: true;
	}
>;

type LegacyMirroredPageFields = {
	doc?: {
		family: DocCitePageFamily;
		leaf?: string | { docId: string; html: string };
		subject: string;
	};
};

export type UniversalConceptPageDocument = Prettify<
	SharedTypedDocFields &
		LegacyMirroredPageFields & {
			[universalConceptPageMarker]: true;
		}
>;

export type LanguageOverlayPageDocument = Prettify<
	SharedTypedDocFields &
		LegacyMirroredPageFields & {
			[languageOverlayPageMarker]: true;
		}
>;

export type TypedDocDocument =
	| GeneratedDocPageDocument
	| UniversalConceptPageDocument
	| LanguageOverlayPageDocument;

export type TypedDocSourceDefinition = TypedDocDocument;

export type TypedDocExport =
	| TypedDocSourceDefinition
	| readonly TypedDocSourceDefinition[];
