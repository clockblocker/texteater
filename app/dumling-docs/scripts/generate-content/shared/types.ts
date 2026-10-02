import type * as Dumling from "dumling/types";

export interface Frontmatter {
	description?: string;
	generatedFrom?: string;
	navTitle?: string;
	order: number;
	routeId?: string;
	title: string;
}

/** One generated page, which `definePagesCodegen` writes as `${routeId}.md`. */
export interface PageOutput {
	body: string;
	frontmatter: Frontmatter;
	routeId: string;
	sourcePath: string;
}

/** One target of a Spec Record, the source of one attestation page. */
export type AttestationSource = {
	entity: Dumling.Attestation;
	sentenceMarkdown: string;
	sourcePath: string;
};
