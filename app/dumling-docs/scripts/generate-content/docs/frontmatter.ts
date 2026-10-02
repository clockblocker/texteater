import type { Frontmatter } from "../shared/types";

function formatStringValue(value: string): string {
	return JSON.stringify(value);
}

export function serializeFrontmatter(frontmatter: Frontmatter): string {
	const lines = [
		"---",
		`title: ${formatStringValue(frontmatter.title)}`,
		...(frontmatter.description === undefined
			? []
			: [`description: ${formatStringValue(frontmatter.description)}`]),
		...(frontmatter.generatedFrom === undefined
			? []
			: [
					`generatedFrom: ${formatStringValue(frontmatter.generatedFrom)}`,
				]),
		...(frontmatter.navTitle === undefined
			? []
			: [`navTitle: ${formatStringValue(frontmatter.navTitle)}`]),
		`order: ${frontmatter.order}`,
		...(frontmatter.routeId === undefined
			? []
			: [`routeId: ${formatStringValue(frontmatter.routeId)}`]),
		"---",
	];

	return `${lines.join("\n")}\n`;
}
