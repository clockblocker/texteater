import { relative } from "node:path";
import { pathToFileURL } from "node:url";
import type {
	AttestedAttestation,
	GeneratedDocPageDocument,
	LanguageOverlayPageDocument,
	TypedDocDocument,
	UniversalConceptPageDocument,
} from "../../../../src/lib/docs/document-shapes.ts";
import {
	generatedDocPageMarker,
	languageOverlayPageMarker,
	universalConceptPageMarker,
} from "../../../../src/lib/docs/document-shapes.ts";
import { sourceTypedDocsDir } from "../../shared/paths";
import { normalizeDocPageMeta } from "../metadata";
import { normalizeRouteId, routeIdForGeneratedDocSourcePath } from "../routes";

export type RuleBlock = {
	body?: string;
	examples: readonly AttestedAttestation[];
	heading?: string;
};

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
		throw new Error(
			`${sourcePath} could not derive a language from its source path.`,
		);
	}

	const routeId = normalizeRouteId([lang, ...segments.slice(2)].join("/"));
	return {
		lang,
		relativeConceptPath:
			routeId === lang ? "" : routeId.slice(lang.length + 1),
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
		throw new Error(
			`${sourcePath} could not be classified as a typed doc source.`,
		);
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
): Promise<TypedDocSource> {
	const { default: document } = (await import(
		pathToFileURL(sourcePath).href
	)) as { default: TypedDocDocument };

	return typedDocSourceForDocument(
		{ ...document, meta: normalizeDocPageMeta(document.meta, sourcePath) },
		sourcePath,
	);
}
