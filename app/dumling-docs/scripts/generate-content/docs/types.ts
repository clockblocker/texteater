import type { Frontmatter, SourcePage } from "../shared/types";

export interface DocsOutput {
	body: string;
	frontmatter: Frontmatter;
	generatedPath: string;
	publicPath: string;
	routeId: string;
	sourcePath: string;
}

export function sourcePageFromDocsOutput(output: DocsOutput): SourcePage {
	return {
		frontmatter: output.frontmatter,
		routeId: output.routeId,
		sourcePath: output.sourcePath,
	};
}
