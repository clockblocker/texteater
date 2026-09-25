import type { AttestedAttestation } from "../../../../src/lib/docs/document-shapes.ts";
import type { TypedDocsGenerationConfig } from "./config";
import type { RuleBlock, RuleDocument } from "./load-typed-doc-source";

export type RenderedChildPage = {
	description?: string;
	href: string;
	title: string;
};

function renderRuleExample(
	example: AttestedAttestation,
	config: TypedDocsGenerationConfig,
	sourceTitle: string,
): string {
	const renderer =
		config.attestedAttestationRenderers[
			config.defaultAttestedAttestationRenderer
		];
	if (renderer === undefined) {
		throw new Error(
			`${sourceTitle} references unknown attested-attestation renderer "${config.defaultAttestedAttestationRenderer}".`,
		);
	}

	return renderer(example);
}

function renderRuleBlock(
	block: RuleBlock,
	config: TypedDocsGenerationConfig,
	sourceTitle: string,
	includeExamples: boolean,
): string[] {
	const parts: string[] = [];

	if (block.heading !== undefined) {
		parts.push(`## ${block.heading}`);
	} else {
		parts.push("---");
	}
	if (block.body !== undefined && block.body.trim().length > 0) {
		parts.push(block.body.trim());
	}
	const examples = block.examples ?? [];
	if (includeExamples && examples.length > 0) {
		parts.push(
			[
				"Examples:",
				...examples.map((example) =>
					renderRuleExample(example, config, sourceTitle),
				),
			].join("\n"),
		);
	}

	return parts;
}

export function renderRuleDocumentBody(
	document: RuleDocument,
	config: TypedDocsGenerationConfig,
	options: { includeExamples?: boolean } = {},
): string {
	const includeExamples = options.includeExamples ?? true;
	const sections: string[] = [];
	const examples = document.examples ?? [];

	if (document.body !== undefined && document.body.trim().length > 0) {
		sections.push(document.body.trim());
	}
	if (includeExamples && examples.length > 0) {
		sections.push(
			[
				"Examples:",
				...examples.map((example) =>
					renderRuleExample(example, config, document.meta.title),
				),
			].join("\n"),
		);
	}

	for (const subsection of document.subsections ?? []) {
		sections.push(
			...renderRuleBlock(
				{
					body: subsection.body,
					examples: subsection.examples ?? [],
					heading: subsection.heading,
				},
				config,
				document.meta.title,
				includeExamples,
			),
		);
	}

	return sections.join("\n\n").trim();
}

export function renderChildPages(
	childPages: readonly RenderedChildPage[],
): string {
	if (childPages.length === 0) {
		return "";
	}

	return [
		"## Subpages",
		...childPages.map((page) =>
			page.description === undefined ||
			page.description.trim().length === 0
				? `- [${page.title}](${page.href})`
				: `- [${page.title}](${page.href}): ${page.description.trim()}`,
		),
	].join("\n");
}
