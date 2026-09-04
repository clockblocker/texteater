import type { LemmaRoute } from "dumling";
import type { SemanticRelation } from "dumrel";

type NoteStudyRoute = Omit<LemmaRoute<"de">, "language">;
export type NoteStudyFamily = NoteStudyRoute["family"];

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
	readonly href?: string;
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

export type NoteStudyFormTable = {
	readonly rowLabel: string;
	readonly columnLabels: readonly string[];
	readonly rows: readonly {
		readonly label: string;
		readonly cells: readonly NoteStudyLine[];
	}[];
};

type NoteStudyFixtureContent = {
	/** Presentation lookup key only. Reading identity comes from Dumling. */
	readonly presentationKey: string;
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
	readonly structure?: readonly NoteStudyLine[];
	readonly translations: readonly string[];
	readonly translatedExplanations?: readonly string[];
	readonly forms?: readonly NoteStudyForm[];
	readonly formTable?: NoteStudyFormTable;
	readonly tags: readonly NoteStudyToken[];
};

export type NoteStudyFixture = NoteStudyRoute & NoteStudyFixtureContent;

export const noteToken = (
	text: string,
	tone: NoteStudyTone = "reference",
	description?: string,
	href?: string,
): NoteStudyToken => ({ text, tone, description, href });
