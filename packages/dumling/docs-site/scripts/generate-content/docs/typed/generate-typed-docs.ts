import { writeGeneratedMarkdown } from "../../shared/fs";
import { pathRelativeToSiteRoot } from "../../shared/paths";
import type { DocsOutput } from "../types";
import { sourcePageFromDocsOutput } from "../types";
import { frontmatterForDocMeta } from "../metadata";
import {
	generatedPathForTypedDoc,
	publicHrefForRouteId,
	publicMarkdownPathForRouteId,
} from "../routes";
import type { TypedDocsGenerationConfig } from "./config";
import { listTypedDocEntrypoints } from "./list-typed-doc-entrypoints";
import type {
	GeneratedDocSource,
	LanguageOverlaySource,
	RuleDocument,
	TypedDocSource,
	UniversalConceptSource,
} from "./load-typed-doc-source";
import { loadTypedDocSource } from "./load-typed-doc-source";
import {
	renderChildPages,
	renderRuleDocument,
	renderRuleDocumentBody,
	type RenderedChildPage,
} from "./render-rule-document";

type RenderPart = {
	document: RuleDocument;
	includeExamples: boolean;
};

type EmittedDocDraft = {
	description?: string;
	navTitle?: string;
	order: number;
	parts: readonly RenderPart[];
	routeId: string;
	sourcePath: string;
	title: string;
};

function mergeInheritedField<T>(
	baseValue: T | undefined,
	overrideValue: T | undefined,
): T | undefined {
	return overrideValue === undefined ? baseValue : overrideValue;
}

function mergeMirroredMeta(
	universal: RuleDocument["meta"],
	overlay?: RuleDocument["meta"],
): {
	description?: string;
	navTitle?: string;
	order: number;
	title: string;
} {
	return {
		description: mergeInheritedField(
			universal.description,
			overlay?.description,
		),
		navTitle: mergeInheritedField(universal.navTitle, overlay?.navTitle),
		order: mergeInheritedField(universal.order, overlay?.order) ?? 0,
		title: mergeInheritedField(universal.title, overlay?.title) ?? universal.title,
	};
}

function emitSingleDocumentDraft(
	source: GeneratedDocSource | UniversalConceptSource | LanguageOverlaySource,
	routeId: string,
): EmittedDocDraft {
	const frontmatter = frontmatterForDocMeta(source.document.meta);
	return {
		description: frontmatter.description,
		navTitle: frontmatter.navTitle,
		order: frontmatter.order,
		parts: [{ document: source.document, includeExamples: true }],
		routeId,
		sourcePath: source.sourcePath,
		title: frontmatter.title,
	};
}

function validateUniqueSourceRoutes(
	sources: readonly TypedDocSource[],
	kind: TypedDocSource["kind"],
): void {
	const seen = new Map<string, string>();

	for (const source of sources) {
		if (source.kind !== kind) {
			continue;
		}

		const existing = seen.get(source.routeId);
		if (existing !== undefined) {
			throw new Error(
				`Duplicate ${kind} route ${source.routeId}: ${existing} and ${source.sourcePath}.`,
			);
		}
		seen.set(source.routeId, source.sourcePath);
	}
}

function universalRouteIdForLanguageRoute(routeId: string, lang: string): string {
	return routeId === lang ? "u" : `u/${routeId.slice(lang.length + 1)}`;
}

function isClassificationInstructionsRoute(
	relativeConceptPath: string,
): boolean {
	return (
		relativeConceptPath === "classification-instructions" ||
		relativeConceptPath.startsWith("classification-instructions/")
	);
}

function isLanguageOnlyClassificationLeaf(
	relativeConceptPath: string,
): boolean {
	if (!relativeConceptPath.startsWith("classification-instructions/")) {
		return false;
	}

	const segments = relativeConceptPath.split("/");
	return segments.length === 2 && (segments[1] ?? "").startsWith("how-to-");
}

function validateLanguageOverlaySource(
	source: LanguageOverlaySource,
	universalsByRouteId: Map<string, UniversalConceptSource>,
): void {
	if (source.relativeConceptPath.length === 0) {
		if (!universalsByRouteId.has("u")) {
			throw new Error(
				`${source.sourcePath} mirrors the language root but no universal /u/ page exists.`,
			);
		}
		return;
	}

	if (isClassificationInstructionsRoute(source.relativeConceptPath)) {
		if (
			source.relativeConceptPath !== "classification-instructions" &&
			!isLanguageOnlyClassificationLeaf(source.relativeConceptPath)
		) {
			throw new Error(
				`${source.sourcePath} is outside the allowed classification-instructions shape. Use lang/{lang}/classification-instructions/index.doc.ts or how-to-*.doc.ts.`,
			);
		}

		if (!universalsByRouteId.has("u/classification-instructions")) {
			throw new Error(
				`${source.sourcePath} requires a universal u/classification-instructions/index.doc.ts page.`,
			);
		}
		return;
	}

	const universalRouteId = universalRouteIdForLanguageRoute(
		source.routeId,
		source.lang,
	);
	if (!universalsByRouteId.has(universalRouteId)) {
		throw new Error(
			`${source.sourcePath} mirrors ${source.routeId}, but no universal counterpart exists at ${universalRouteId}.`,
		);
	}
}

function ancestorRouteIds(routeId: string): string[] {
	const segments = routeId.split("/");
	const ancestors: string[] = [];

	for (let length = 1; length < segments.length; length += 1) {
		ancestors.push(segments.slice(0, length).join("/"));
	}

	return ancestors;
}

function sortPageDrafts(
	pages: readonly EmittedDocDraft[],
): readonly EmittedDocDraft[] {
	return pages.toSorted((left, right) => {
		const orderDelta = left.order - right.order;
		if (orderDelta !== 0) {
			return orderDelta;
		}
		return left.title.localeCompare(right.title);
	});
}

function childPagesForRoute(
	routeId: string,
	pagesByRouteId: Map<string, EmittedDocDraft>,
): readonly RenderedChildPage[] {
	const children = [...pagesByRouteId.values()].filter((candidate) => {
		if (candidate.routeId === routeId) {
			return false;
		}

		if (routeId === "index") {
			return !candidate.routeId.includes("/");
		}

		if (!candidate.routeId.startsWith(`${routeId}/`)) {
			return false;
		}

		return !candidate.routeId.slice(routeId.length + 1).includes("/");
	});

	return sortPageDrafts(children).map((child) => ({
		description: child.description,
		href: publicHrefForRouteId(child.routeId),
		title: child.navTitle ?? child.title,
	}));
}

function renderDraftBody(
	draft: EmittedDocDraft,
	config: TypedDocsGenerationConfig,
	childPages: readonly RenderedChildPage[],
): string {
	if (draft.parts.length === 1) {
		return renderRuleDocument(draft.parts[0]!.document, config, {
			childPages,
			titleOverride: draft.title,
		});
	}

	const sections = [`# ${draft.title}`];
	for (const part of draft.parts) {
		const body = renderRuleDocumentBody(part.document, config, {
			includeExamples: part.includeExamples,
		});
		if (body.length > 0) {
			sections.push(body);
		}
	}
	if (childPages.length > 0) {
		sections.push(renderChildPages(childPages));
	}

	return `${sections.join("\n\n").trim()}\n`;
}

function buildMirroredLanguageDrafts(
	overlaySources: readonly LanguageOverlaySource[],
	universalsByRouteId: Map<string, UniversalConceptSource>,
): EmittedDocDraft[] {
	const overlaysByLang = new Map<string, LanguageOverlaySource[]>();
	for (const source of overlaySources) {
		const list = overlaysByLang.get(source.lang) ?? [];
		list.push(source);
		overlaysByLang.set(source.lang, list);
	}

	const drafts: EmittedDocDraft[] = [];

	for (const [lang, sources] of overlaysByLang) {
		const explicitByRouteId = new Map<string, LanguageOverlaySource>();
		const mirroredRouteIds = new Set<string>();

		for (const source of sources) {
			explicitByRouteId.set(source.routeId, source);

			if (!isLanguageOnlyClassificationLeaf(source.relativeConceptPath)) {
				mirroredRouteIds.add(source.routeId);
			}
			for (const ancestorRouteId of ancestorRouteIds(source.routeId)) {
				mirroredRouteIds.add(ancestorRouteId);
			}
		}

		for (const routeId of [...mirroredRouteIds].toSorted()) {
			const explicitOverlay = explicitByRouteId.get(routeId);
			if (
				explicitOverlay !== undefined &&
				isLanguageOnlyClassificationLeaf(explicitOverlay.relativeConceptPath)
			) {
				continue;
			}

			const universalRouteId = universalRouteIdForLanguageRoute(routeId, lang);
			const universalSource = universalsByRouteId.get(universalRouteId);
			if (universalSource === undefined) {
				throw new Error(
					`Cannot emit ${routeId}: missing universal counterpart ${universalRouteId}.`,
				);
			}

			const mergedMeta = mergeMirroredMeta(
				universalSource.document.meta,
				explicitOverlay?.document.meta,
			);

			drafts.push({
				description: mergedMeta.description,
				navTitle: mergedMeta.navTitle,
				order: mergedMeta.order,
				parts: [
					{
						document: universalSource.document,
						includeExamples: false,
					},
					...(explicitOverlay === undefined
						? []
						: [
								{
									document: explicitOverlay.document,
									includeExamples: true,
								},
							]),
				],
				routeId,
				sourcePath: explicitOverlay?.sourcePath ?? universalSource.sourcePath,
				title: mergedMeta.title,
			});
		}

		for (const source of sources) {
			if (!isLanguageOnlyClassificationLeaf(source.relativeConceptPath)) {
				continue;
			}
			drafts.push(emitSingleDocumentDraft(source, source.routeId));
		}
	}

	return drafts;
}

export async function discoverTypedDocs(
	config: TypedDocsGenerationConfig,
): Promise<DocsOutput[]> {
	const entrypoints = listTypedDocEntrypoints();
	const sourceGroups = await Promise.all(
		entrypoints.map((sourcePath) => loadTypedDocSource(sourcePath)),
	);
	const sources = sourceGroups.flat();

	validateUniqueSourceRoutes(sources, "generated-page");
	validateUniqueSourceRoutes(sources, "universal-concept-page");
	validateUniqueSourceRoutes(sources, "language-overlay-page");

	const generatedSources = sources.filter(
		(source): source is GeneratedDocSource => source.kind === "generated-page",
	);
	const universalSources = sources.filter(
		(source): source is UniversalConceptSource =>
			source.kind === "universal-concept-page",
	);
	const overlaySources = sources.filter(
		(source): source is LanguageOverlaySource =>
			source.kind === "language-overlay-page",
	);

	const universalsByRouteId = new Map(
		universalSources.map((source) => [source.routeId, source] as const),
	);

	for (const source of overlaySources) {
		validateLanguageOverlaySource(source, universalsByRouteId);
	}

	const emittedDrafts = [
		...generatedSources.map((source) =>
			emitSingleDocumentDraft(source, source.routeId),
		),
		...universalSources.map((source) =>
			emitSingleDocumentDraft(source, source.routeId),
		),
		...buildMirroredLanguageDrafts(overlaySources, universalsByRouteId),
	];

	const pagesByRouteId = new Map<string, EmittedDocDraft>();
	for (const draft of emittedDrafts) {
		const existing = pagesByRouteId.get(draft.routeId);
		if (existing !== undefined) {
			throw new Error(
				`Docs routeId collision: ${existing.sourcePath} and ${draft.sourcePath} both resolve to ${draft.routeId}.`,
			);
		}
		pagesByRouteId.set(draft.routeId, draft);
	}

	return [...pagesByRouteId.values()].map((draft) => {
		const childPages = childPagesForRoute(draft.routeId, pagesByRouteId);

		return {
			body: renderDraftBody(draft, config, childPages),
			frontmatter: {
				description: draft.description,
				generatedFrom: pathRelativeToSiteRoot(draft.sourcePath),
				navTitle: draft.navTitle,
				order: draft.order,
				routeId: draft.routeId,
				title: draft.title,
			},
			generatedPath: generatedPathForTypedDoc(draft.routeId),
			publicPath: publicMarkdownPathForRouteId(draft.routeId),
			routeId: draft.routeId,
			sourcePath: draft.sourcePath,
		};
	});
}

export function writeTypedDocs(outputs: DocsOutput[]) {
	for (const output of outputs) {
		writeGeneratedMarkdown(
			output.generatedPath,
			output.frontmatter,
			output.body,
			output.publicPath,
		);
	}

	return outputs.map((output) => sourcePageFromDocsOutput(output));
}
