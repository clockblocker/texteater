import type { SemanticRelation } from "dumrel";
import type { DE_READING_BLOCKS_BY_FAMILY_KIND } from "../../../shared/reading-block-layout";

type GermanUnitReadingCatalog = typeof DE_READING_BLOCKS_BY_FAMILY_KIND;

export type NoteStudyFamily = keyof GermanUnitReadingCatalog;

type NoteStudyRoute = {
	[Family in NoteStudyFamily]: {
		readonly family: Family;
		readonly kind: keyof GermanUnitReadingCatalog[Family];
	};
}[NoteStudyFamily];

export type NoteStudyTone =
	| "reference"
	| "shadow"
	| "feminine"
	| "masculine"
	| "neuter"
	| "plural";

export type NoteStudyToken = {
	readonly text: string;
	readonly tone?: NoteStudyTone;
	readonly description?: string;
};

export type NoteStudyLine = readonly (string | NoteStudyToken)[];

export type NoteStudyRelation = {
	readonly relation: SemanticRelation;
	readonly label: string;
	readonly mark: string;
	readonly content: NoteStudyLine;
};

export type NoteStudyForm = {
	readonly label: string;
	readonly content: NoteStudyLine;
};

type NoteStudyFixtureContent = {
	readonly slug: string;
	readonly emoji: string;
	readonly title: NoteStudyLine;
	readonly titleText: string;
	readonly ipa?: string;
	readonly pronunciationHref?: string;
	readonly summary: string;
	readonly contexts: readonly NoteStudyLine[];
	readonly contextTone?: NoteStudyTone;
	readonly definition: string;
	readonly relations?: readonly NoteStudyRelation[];
	readonly formation?: readonly NoteStudyLine[];
	readonly translations: readonly string[];
	readonly forms?: readonly NoteStudyForm[];
	readonly tags: readonly NoteStudyToken[];
};

export type NoteStudyFixture = NoteStudyRoute & NoteStudyFixtureContent;

export const noteToken = (
	text: string,
	tone: NoteStudyTone = "reference",
	description?: string,
): NoteStudyToken => ({ text, tone, description });
