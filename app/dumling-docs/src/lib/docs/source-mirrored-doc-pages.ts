import type {
	DocCitePageFamily,
	DocPageMeta,
	DocSection,
	GeneratedDocPageDocument,
	LanguageOverlayPageDocument,
	UniversalConceptPageDocument,
} from "./document-shapes.ts";
import {
	generatedDocPageMarker,
	languageOverlayPageMarker,
	universalConceptPageMarker,
} from "./document-shapes.ts";

type SharedOptions = DocSection & {
	description?: string;
	navTitle?: string;
	order?: number;
	subsections?: readonly DocSection[];
	title: string;
};

type LegacyMirroredOptions = SharedOptions & {
	family: DocCitePageFamily;
	leaf?: string | { docId: string; html: string };
	subject: string;
};

function toMeta(options: {
	description?: string;
	navTitle?: string;
	order?: number;
	title: string;
}): DocPageMeta {
	return {
		description: options.description,
		navTitle: options.navTitle,
		order: options.order,
		title: options.title,
	};
}

function leafLabel(
	leaf: LegacyMirroredOptions["leaf"],
	title: string,
): string {
	if (typeof leaf === "string") {
		return leaf;
	}

	return title;
}

function defaultUniversalStubDescription(
	options: Omit<LegacyMirroredOptions, "body" | "examples" | "subsections">,
): string {
	const label = leafLabel(options.leaf, options.title);

	switch (options.family) {
		case "scope":
			return "Shared classifier instructions that extend the universal tree.";
		case "entity":
			if (options.leaf === undefined) {
				return "Overview of the public entity categories in doc-cite.";
			}
			return `${label} page in the public doc-cite tree.`;
		case "surface":
			return `${label} surface in the public doc-cite tree.`;
		case "kind":
			return `${label} page in the public kind tree.`;
		case "pos":
			if (options.leaf === undefined) {
				return "Overview of lexeme subtypes in the public concept tree.";
			}
			return `${label} page in the public POS tree.`;
		case "morpheme":
			if (options.leaf === undefined) {
				return "Overview of morpheme subpages in the public concept tree.";
			}
			return `${label} page in the public morpheme tree.`;
		case "phraseme":
			if (options.leaf === undefined) {
				return "Overview of phraseme subpages in the public concept tree.";
			}
			return `${label} page in the public phraseme tree.`;
		case "construction":
			if (options.leaf === undefined) {
				return "Overview of construction subpages in the public concept tree.";
			}
			return `${label} page in the public construction tree.`;
		case "feature":
			if (options.leaf === undefined) {
				return "Overview of grammatical, selection, and surface feature pages.";
			}
			return `${label} page in the public feature tree.`;
		case "feature-selection":
			if (options.leaf === undefined) {
				return "Overview of selection features in the public doc-cite tree.";
			}
			return `${label} page for public selection features.`;
		case "feature-surface":
			if (options.leaf === undefined) {
				return "Overview of surface features in the public doc-cite tree.";
			}
			return `${label} page for public surface features.`;
	}
}

export function defineGeneratedDocPage(
	options: SharedOptions,
): GeneratedDocPageDocument {
	return {
		[generatedDocPageMarker]: true,
		body: options.body,
		examples: options.examples ?? [],
		meta: toMeta(options),
		subsections: options.subsections,
	};
}

export function defineUniversalConceptPage(
	options: LegacyMirroredOptions,
): UniversalConceptPageDocument {
	return {
		[universalConceptPageMarker]: true,
		body: options.body,
		doc: {
			family: options.family,
			leaf: options.leaf,
			subject: options.subject,
		},
		examples: options.examples ?? [],
		meta: toMeta(options),
		subsections: options.subsections,
	};
}

export function defineUniversalConceptStubPage(
	options: Omit<LegacyMirroredOptions, "body" | "examples" | "subsections">,
): UniversalConceptPageDocument {
	return defineUniversalConceptPage({
		...options,
		description:
			options.description ?? defaultUniversalStubDescription(options),
	});
}

export function defineLanguageOverlayPage(
	options: LegacyMirroredOptions,
): LanguageOverlayPageDocument {
	return {
		[languageOverlayPageMarker]: true,
		body: options.body,
		doc: {
			family: options.family,
			leaf: options.leaf,
			subject: options.subject,
		},
		examples: options.examples ?? [],
		meta: toMeta(options),
		subsections: options.subsections,
	};
}

export type {
	DocSection,
	GeneratedDocPageDocument,
	LanguageOverlayPageDocument,
	UniversalConceptPageDocument,
};
