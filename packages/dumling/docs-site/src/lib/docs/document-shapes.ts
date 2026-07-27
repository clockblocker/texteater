import type { AttestedSelection } from "dumling/types";
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

export type DocCitePageFamily =
	| "scope"
	| "entity"
	| "surface"
	| "kind"
	| "pos"
	| "morpheme"
	| "phraseme"
	| "construction"
	| "feature"
	| "feature-selection"
	| "feature-surface";

export type DocSection = {
	body?: string;
	examples?: readonly AttestedSelection[];
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
