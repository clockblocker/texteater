import type * as Dumling from "dumling/types";

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
	entity: Dumling.Lemma | Dumling.Surface | Dumling.Attestation;
	isVerified?: true;
	order?: number;
	sentenceMarkdown?: string;
	sourcePath: string;
	title?: string;
	wrappedEntityKind?: "attestation" | "lemma" | "surface";
};

export type AttestedSentenceParts = {
	selectedText: string;
	sentenceText: string;
};

export type OccurrenceAttestationSource = Omit<
	AttestationSource,
	"entity" | "sentenceMarkdown"
> & {
	entity: Dumling.Attestation<Dumling.Language>;
	sentenceMarkdown: string;
};
