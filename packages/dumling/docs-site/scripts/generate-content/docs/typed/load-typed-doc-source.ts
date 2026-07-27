import { relative } from "node:path";
import { pathToFileURL } from "node:url";
import type { AttestedSelection } from "../../../../../src/types/public-types.ts";
import type {
	GeneratedDocPageDocument,
	LanguageOverlayPageDocument,
	TypedDocDocument,
	TypedDocExport,
	UniversalConceptPageDocument,
} from "../../../../src/lib/docs/document-shapes.ts";
import {
	generatedDocPageMarker,
	languageOverlayPageMarker,
	universalConceptPageMarker,
} from "../../../../src/lib/docs/document-shapes.ts";
import { sourceTypedDocsDir } from "../../shared/paths";
import { parseDocPageMeta } from "../metadata";
import {
	normalizeRouteId,
	routeIdForGeneratedDocSourcePath,
} from "../routes";

export type RuleBlock = {
	body?: string;
	examples: readonly AttestedSelection[];
	heading?: string;
};

export type RuleDocument = TypedDocDocument;

export type GeneratedDocSource = {
	document: GeneratedDocPageDocument;
	kind: "generated-page";
	routeId: string;
	sourcePath: string;
};

export type UniversalConceptSource = {
	document: UniversalConceptPageDocument;
	kind: "universal-concept-page";
	relativeConceptPath: string;
	routeId: string;
	sourcePath: string;
};

export type LanguageOverlaySource = {
	document: LanguageOverlayPageDocument;
	kind: "language-overlay-page";
	lang: string;
	relativeConceptPath: string;
	routeId: string;
	sourcePath: string;
};

export type TypedDocSource =
	| GeneratedDocSource
	| UniversalConceptSource
	| LanguageOverlaySource;

function isGeneratedDocPageDocument(
	document: TypedDocDocument,
): document is GeneratedDocPageDocument {
	return generatedDocPageMarker in document;
}

function isUniversalConceptPageDocument(
	document: TypedDocDocument,
): document is UniversalConceptPageDocument {
	return universalConceptPageMarker in document;
}

function isLanguageOverlayPageDocument(
	document: TypedDocDocument,
): document is LanguageOverlayPageDocument {
	return languageOverlayPageMarker in document;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAttestedSelection(value: unknown): value is AttestedSelection {
	if (!isRecord(value)) {
		return false;
	}
	if (typeof value.sentenceMarkdown !== "string") {
		return false;
	}
	if (!isRecord(value.selection)) {
		return false;
	}
	return typeof value.selection.language === "string";
}

function parseRuleExample(
	value: unknown,
	sourcePath: string,
): AttestedSelection {
	if (!isAttestedSelection(value)) {
		throw new Error(
			`${sourcePath} rule examples must reference AttestedSelection sources.`,
		);
	}
	return value;
}

function parseRuleBlock(value: unknown, sourcePath: string): RuleBlock {
	if (!isRecord(value)) {
		throw new Error(`${sourcePath} has an invalid rule block.`);
	}
	if (value.heading !== undefined && typeof value.heading !== "string") {
		throw new Error(`${sourcePath} has a non-string rule block heading.`);
	}
	if (value.body !== undefined && typeof value.body !== "string") {
		throw new Error(`${sourcePath} has a non-string rule block body.`);
	}

	const examples =
		value.examples === undefined
			? []
			: Array.isArray(value.examples)
				? value.examples.map((example) =>
						parseRuleExample(example, sourcePath),
					)
				: (() => {
						throw new Error(
							`${sourcePath} rule blocks must define examples as an array when present.`,
						);
					})();

	return {
		body: value.body,
		examples,
		heading: value.heading,
	};
}

function parseRuleBlocks(
	value: unknown,
	sourcePath: string,
): readonly RuleBlock[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		throw new Error(
			`${sourcePath} must export subsections as an array when present.`,
		);
	}

	return value.map((block) => parseRuleBlock(block, sourcePath));
}

function parseDocumentBody(
	value: unknown,
	sourcePath: string,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "string") {
		throw new Error(`${sourcePath} has a non-string document body.`);
	}
	return value;
}

function parseBaseDocumentFields(
	value: Record<string, unknown>,
	sourcePath: string,
): {
	body?: string;
	examples: readonly AttestedSelection[];
	meta: ReturnType<typeof parseDocPageMeta>;
	subsections?: readonly RuleBlock[];
} {
	return {
		body: parseDocumentBody(value.body, sourcePath),
		examples:
			value.examples === undefined
				? []
				: Array.isArray(value.examples)
					? value.examples.map((example) =>
							parseRuleExample(example, sourcePath),
						)
					: (() => {
							throw new Error(`${sourcePath} must export examples as an array.`);
						})(),
		meta: parseDocPageMeta(value.meta, sourcePath),
		subsections: parseRuleBlocks(value.subsections, sourcePath),
	};
}

function parseGeneratedDocPageDocument(
	value: Record<string, unknown>,
	sourcePath: string,
): GeneratedDocPageDocument {
	const parsed = parseBaseDocumentFields(value, sourcePath);
	return {
		[generatedDocPageMarker]: true,
		body: parsed.body,
		examples: parsed.examples,
		meta: parsed.meta,
		subsections: parsed.subsections,
	};
}

function parseUniversalConceptPageDocument(
	value: Record<string, unknown>,
	sourcePath: string,
): UniversalConceptPageDocument {
	const parsed = parseBaseDocumentFields(value, sourcePath);
	return {
		[universalConceptPageMarker]: true,
		body: parsed.body,
		doc: isRecord(value.doc)
			? (value.doc as UniversalConceptPageDocument["doc"])
			: undefined,
		examples: parsed.examples,
		meta: parsed.meta,
		subsections: parsed.subsections,
	};
}

function parseLanguageOverlayPageDocument(
	value: Record<string, unknown>,
	sourcePath: string,
): LanguageOverlayPageDocument {
	const parsed = parseBaseDocumentFields(value, sourcePath);
	return {
		[languageOverlayPageMarker]: true,
		body: parsed.body,
		doc: isRecord(value.doc)
			? (value.doc as LanguageOverlayPageDocument["doc"])
			: undefined,
		examples: parsed.examples,
		meta: parsed.meta,
		subsections: parsed.subsections,
	};
}

function parseTypedDocDocument(
	value: unknown,
	sourcePath: string,
): TypedDocDocument {
	if (!isRecord(value)) {
		throw new Error(
			`${sourcePath} must default-export a typed document object or document array.`,
		);
	}

	if (value[generatedDocPageMarker] === true) {
		return parseGeneratedDocPageDocument(value, sourcePath);
	}
	if (value[universalConceptPageMarker] === true) {
		return parseUniversalConceptPageDocument(value, sourcePath);
	}
	if (value[languageOverlayPageMarker] === true) {
		return parseLanguageOverlayPageDocument(value, sourcePath);
	}

	throw new Error(
		`${sourcePath} must use defineGeneratedDocPage, defineUniversalConceptPage, or defineLanguageOverlayPage.`,
	);
}

function parseTypedDocExport(
	value: unknown,
	sourcePath: string,
): readonly TypedDocDocument[] {
	const exported = value as TypedDocExport;
	return Array.isArray(exported)
		? exported.map((entry) => parseTypedDocDocument(entry, sourcePath))
		: [parseTypedDocDocument(exported, sourcePath)];
}

function normalizeSourceRelativePath(path: string): string {
	return path.replaceAll("\\", "/");
}

function loadUniversalRouteInfo(sourcePath: string): {
	relativeConceptPath: string;
	routeId: string;
} {
	const relativePath = normalizeSourceRelativePath(
		relative(sourceTypedDocsDir, sourcePath).replace(/\.doc\.ts$/u, ""),
	);
	const routeId = normalizeRouteId(relativePath);
	if (routeId !== "u" && !routeId.startsWith("u/")) {
		throw new Error(
			`${sourcePath} must live under src/to-generate/docs/u to use defineUniversalConceptPage.`,
		);
	}

	return {
		relativeConceptPath: routeId === "u" ? "" : routeId.slice("u/".length),
		routeId,
	};
}

function loadLanguageOverlayRouteInfo(sourcePath: string): {
	lang: string;
	relativeConceptPath: string;
	routeId: string;
} {
	const relativePath = normalizeSourceRelativePath(
		relative(sourceTypedDocsDir, sourcePath).replace(/\.doc\.ts$/u, ""),
	);
	const segments = relativePath.split("/");
	if (segments[0] !== "lang" || segments.length < 2) {
		throw new Error(
			`${sourcePath} must live under src/to-generate/docs/lang/{lang} to use defineLanguageOverlayPage.`,
		);
	}

	const lang = (segments[1] ?? "").trim();
	if (lang.length === 0) {
		throw new Error(`${sourcePath} could not derive a language from its source path.`);
	}

	const routeId = normalizeRouteId([lang, ...segments.slice(2)].join("/"));
	return {
		lang,
		relativeConceptPath: routeId === lang ? "" : routeId.slice(lang.length + 1),
		routeId,
	};
}

function typedDocSourceForDocument(
	document: TypedDocDocument,
	sourcePath: string,
): TypedDocSource {
	if (isGeneratedDocPageDocument(document)) {
		return {
			document,
			kind: "generated-page",
			routeId: routeIdForGeneratedDocSourcePath(sourcePath),
			sourcePath,
		};
	}

	if (isUniversalConceptPageDocument(document)) {
		return {
			document,
			kind: "universal-concept-page",
			...loadUniversalRouteInfo(sourcePath),
			sourcePath,
		};
	}

	if (!isLanguageOverlayPageDocument(document)) {
		throw new Error(`${sourcePath} could not be classified as a typed doc source.`);
	}

	return {
		document,
		kind: "language-overlay-page",
		...loadLanguageOverlayRouteInfo(sourcePath),
		sourcePath,
	};
}

export async function loadTypedDocSource(
	sourcePath: string,
): Promise<readonly TypedDocSource[]> {
	const moduleExports = (await import(
		pathToFileURL(sourcePath).href
	)) as Record<string, unknown>;
	const documents = parseTypedDocExport(moduleExports.default, sourcePath);

	return documents.map((document) =>
		typedDocSourceForDocument(document, sourcePath),
	);
}
