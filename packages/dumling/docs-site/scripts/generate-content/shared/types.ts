import type {
	EntityValue,
	SupportedLanguage,
} from "../../../../src/types/public-types.ts";

export interface Frontmatter {
	description?: string;
	generatedFrom?: string;
	navTitle?: string;
	order: number;
	routeId?: string;
	title: string;
}

export interface SourcePage {
	frontmatter: Frontmatter;
	routeId: string;
	sourcePath: string;
}

export type AttestationSource = {
	classifierNotes?: string;
	classificationMistakes?: string;
	entity: EntityValue;
	isVerified?: true;
	order?: number;
	sentenceMarkdown?: string;
	sourcePath: string;
	title?: string;
};

export type SelectionSentenceParts = {
	selectedText: string;
	sentenceText: string;
};

export type SelectionAttestationSource = {
	classifierNotes?: string;
	classificationMistakes?: string;
	entity: {
		language: SupportedLanguage;
		spelledSelection: string;
		surface: {
			normalizedFullSurface: string;
		};
	};
	isVerified?: true;
	sentenceMarkdown: string;
	sourcePath: string;
};

export type LogbookFileKind = "classifier" | "reviewer" | "summary";
