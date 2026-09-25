import { fileURLToPath } from "node:url";
import { rules } from "dumspec";
import { specRecords } from "../../../../src/lib/docs/spec-examples.ts";
import { pathRelativeToSiteRoot } from "../../shared/paths";
import { frontmatterForDocMeta } from "../metadata";
import {
	generatedPathForTypedDoc,
	publicHrefForRouteId,
	publicMarkdownPathForRouteId,
} from "../routes";
import { checkRoutePages } from "../spec/route-page-check";
import { loadSchemaRoutes } from "../spec/schema-routes";
import { buildSpecPages, type SpecPage } from "../spec/spec-pages";
import type { DocsOutput } from "../types";
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
	type RenderedChildPage,
	renderChildPages,
	renderRuleDocumentBody,
} from "./render-rule-document";

type RenderPart = {
	document: RuleDocument;
	includeExamples: boolean;
};

type EmittedDocDraft = {
	description?: string;
	/** A generated opening paragraph that precedes the parts. */
	lead?: string;
	navTitle?: string;
	order: number;
	parts: readonly RenderPart[];
	routeId: string;
	/** Generated Markdown sections that follow the parts. */
	sections: readonly string[];
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
		title:
			mergeInheritedField(universal.title, overlay?.title) ??
			universal.title,
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
		sections: [],
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

function universalRouteIdForLanguageRoute(
	routeId: string,
	lang: string,
): string {
	return routeId === lang ? "u" : `u/${routeId.slice(lang.length + 1)}`;
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
	const sections = [`# ${draft.title}`];
	if (draft.lead !== undefined) {
		sections.push(draft.lead);
	}
	for (const part of draft.parts) {
		const body = renderRuleDocumentBody(part.document, config, {
			includeExamples: part.includeExamples,
		});
		if (body.length > 0) {
			sections.push(body);
		}
	}
	sections.push(...draft.sections);
	if (childPages.length > 0) {
		sections.push(renderChildPages(childPages));
	}

	return `${sections.join("\n\n").trim()}\n`;
}

/**
 * Mirrors each language overlay onto its universal page, and fills in the
 * ancestors of overlays and of generated language pages the same way.
 */
function buildMirroredLanguageDrafts(
	overlaySources: readonly LanguageOverlaySource[],
	universalsByRouteId: Map<string, UniversalConceptSource>,
	generatedRouteIds: ReadonlySet<string>,
): EmittedDocDraft[] {
	const explicitByRouteId = new Map(
		overlaySources.map((source) => [source.routeId, source] as const),
	);
	const mirroredRouteIds = new Set<string>();
	for (const routeId of [
		...explicitByRouteId.keys(),
		...[...generatedRouteIds].filter(
			(routeId) => !routeId.startsWith("u/"),
		),
	]) {
		if (explicitByRouteId.has(routeId)) {
			mirroredRouteIds.add(routeId);
		}
		for (const ancestorRouteId of ancestorRouteIds(routeId)) {
			if (!generatedRouteIds.has(ancestorRouteId)) {
				mirroredRouteIds.add(ancestorRouteId);
			}
		}
	}

	return [...mirroredRouteIds].toSorted().map((routeId) => {
		const explicitOverlay = explicitByRouteId.get(routeId);
		const lang = routeId.split("/")[0] ?? routeId;
		const universalRouteId = universalRouteIdForLanguageRoute(
			routeId,
			lang,
		);
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

		return {
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
			sections: [],
			sourcePath:
				explicitOverlay?.sourcePath ?? universalSource.sourcePath,
			title: mergedMeta.title,
		};
	});
}

const specPagesSourcePath = fileURLToPath(
	new URL("../spec/spec-pages.ts", import.meta.url),
);

/** A generated spec page, introduced by the hand-written page at its route. */
function specPageDraft(
	page: SpecPage,
	intro: UniversalConceptSource | LanguageOverlaySource | undefined,
): EmittedDocDraft {
	return {
		description: page.description,
		lead: page.lead,
		navTitle: page.navTitle,
		order: page.order,
		parts:
			intro === undefined
				? []
				: [{ document: intro.document, includeExamples: true }],
		routeId: page.routeId,
		sections: page.sections,
		sourcePath: intro?.sourcePath ?? specPagesSourcePath,
		title: page.title,
	};
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

	const routes = await loadSchemaRoutes();
	const spec = buildSpecPages({
		handWrittenRouteIds: new Set(sources.map((source) => source.routeId)),
		records: specRecords(),
		routes,
		rules,
	});
	const specRouteIds = new Set(spec.pages.map((page) => page.routeId));
	const routeProblems = checkRoutePages(
		[...specRouteIds, ...sources.map((source) => source.routeId)],
		routes,
	);
	if (routeProblems.length > 0) {
		throw new Error(
			`Docs pages and Dumling schema routes disagree:\n- ${routeProblems.join("\n- ")}`,
		);
	}
	const appendices = new Map(
		spec.appendices.map((appendix) => [
			appendix.routeId,
			appendix.sections,
		]),
	);

	const generatedSources = sources.filter(
		(source): source is GeneratedDocSource =>
			source.kind === "generated-page",
	);
	const universalSources = sources.filter(
		(source): source is UniversalConceptSource =>
			source.kind === "universal-concept-page",
	);
	const overlaySources = sources.filter(
		(source): source is LanguageOverlaySource =>
			source.kind === "language-overlay-page",
	);
	const introsByRouteId = new Map(
		[...universalSources, ...overlaySources]
			.filter((source) => specRouteIds.has(source.routeId))
			.map((source) => [source.routeId, source] as const),
	);
	const mirroredOverlaySources = overlaySources.filter(
		(source) => !specRouteIds.has(source.routeId),
	);

	const universalsByRouteId = new Map(
		universalSources.map((source) => [source.routeId, source] as const),
	);

	for (const source of mirroredOverlaySources) {
		validateLanguageOverlaySource(source, universalsByRouteId);
	}

	const emittedDrafts = [
		...generatedSources.map((source) =>
			emitSingleDocumentDraft(source, source.routeId),
		),
		...universalSources
			.filter((source) => !specRouteIds.has(source.routeId))
			.map((source) => ({
				...emitSingleDocumentDraft(source, source.routeId),
				sections: appendices.get(source.routeId) ?? [],
			})),
		...spec.pages.map((page) =>
			specPageDraft(page, introsByRouteId.get(page.routeId)),
		),
		...buildMirroredLanguageDrafts(
			mirroredOverlaySources,
			universalsByRouteId,
			specRouteIds,
		),
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
