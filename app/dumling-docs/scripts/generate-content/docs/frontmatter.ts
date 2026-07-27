import type { Frontmatter } from "../shared/types";

function parseStringValue(rawValue: string): string {
	if (
		rawValue.length >= 2 &&
		rawValue.startsWith('"') &&
		rawValue.endsWith('"')
	) {
		return JSON.parse(rawValue) as string;
	}
	return rawValue;
}

function formatStringValue(value: string): string {
	return JSON.stringify(value);
}

export function parseFrontmatter(
	sourceText: string,
	sourcePath: string,
): {
	body: string;
	frontmatter: Frontmatter;
} {
	if (!sourceText.startsWith("---\n")) {
		throw new Error(`${sourcePath} is missing frontmatter.`);
	}

	const endIndex = sourceText.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		throw new Error(`${sourcePath} has unterminated frontmatter.`);
	}

	const frontmatterText = sourceText.slice(4, endIndex);
	const body = sourceText
		.slice(endIndex + "\n---\n".length)
		.replace(/^\n/, "");
	const values = new Map<string, string>();

	for (const rawLine of frontmatterText.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0) {
			continue;
		}
		const separatorIndex = line.indexOf(":");
		if (separatorIndex === -1) {
			throw new Error(
				`Invalid frontmatter line in ${sourcePath}: ${rawLine}`,
			);
		}
		values.set(
			line.slice(0, separatorIndex).trim(),
			line.slice(separatorIndex + 1).trim(),
		);
	}

	const title = values.get("title");
	if (title === undefined || title.length === 0) {
		throw new Error(`${sourcePath} is missing a title.`);
	}

	const orderText = values.get("order") ?? "0";
	const order = Number(orderText);
	if (!Number.isFinite(order)) {
		throw new Error(`${sourcePath} has an invalid order: ${orderText}`);
	}

	return {
		body,
		frontmatter: {
			description:
				values.get("description") === undefined
					? undefined
					: parseStringValue(values.get("description") as string),
			generatedFrom:
				values.get("generatedFrom") === undefined
					? undefined
					: parseStringValue(values.get("generatedFrom") as string),
			navTitle:
				values.get("navTitle") === undefined
					? undefined
					: parseStringValue(values.get("navTitle") as string),
			order,
			routeId:
				values.get("routeId") === undefined
					? undefined
					: parseStringValue(values.get("routeId") as string),
			title: parseStringValue(title),
		},
	};
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
