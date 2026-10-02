import type {
	AttestedAttestation,
	TypedDocDocument,
} from "../../../../src/lib/docs/document-shapes.ts";
import { describeLemma } from "../../../../src/lib/unit-presentation";
import { withLinkedAttestationSpan } from "../attested-attestation";
import type { RuleBlock } from "./load-typed-doc-source";

export type RenderedChildPage = {
	description?: string;
	href: string;
	title: string;
};

function renderRuleExample(example: AttestedAttestation): string {
	return `- ${JSON.stringify(withLinkedAttestationSpan(example))} -> ${describeLemma(example.attestation.surface.lemma)}`;
}

function renderRuleBlock(block: RuleBlock, includeExamples: boolean): string[] {
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
			["Examples:", ...examples.map(renderRuleExample)].join("\n"),
		);
	}

	return parts;
}

export function renderRuleDocumentBody(
	document: TypedDocDocument,
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
			["Examples:", ...examples.map(renderRuleExample)].join("\n"),
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
