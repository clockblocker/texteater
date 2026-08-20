import { expect, test } from "bun:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { renderNote } from "../src/notes";
import type { NoteBlockKindFor } from "../src/notes/note-block-kind";
import {
	type ReadingNoteData,
	type ReadingNoteDefaultRenderer,
	type ReadingNotePresentationCapabilities,
	type ReadingNoteRenderContext,
	type ReadingNoteRendererOverrideRegistry,
	renderReadingNote,
} from "../src/notes/reading";
import { deReadingNoteModule } from "../src/notes/reading/de";
import { DEFAULT_READING_NOTE_RENDERER_FOR } from "../src/notes/reading/default-renderers";
import { ReadingNoteBlockErrorBoundary } from "../src/notes/reading/error-block";
import { createDefaultReadingNoteCapabilities } from "../src/notes/reading/reading-note-render-context";
import { narrowReadingNoteRoute } from "../src/notes/reading/reading-note-route";
import { renderReadingNoteBlocks } from "../src/notes/reading/render-reading-note";
import {
	deduplicateSourceContexts,
	mergeSourceContextPage,
	readingDefinitionMutationArgs,
	resetSourceContextPagination,
	sourceContextPageFailureMessage,
} from "../src/views/unit-reading-note-view";

test("narrows each valid Reading route once and rejects unsupported coordinates", () => {
	const note = readingNoteFixture();
	expect(narrowReadingNoteRoute(note)).toEqual({
		targetLanguage: "de",
		family: "Lexeme",
		kind: "NOUN",
	});
	expect(
		narrowReadingNoteRoute(readingNoteFixture({ language: "en" })),
	).toBeNull();
	expect(
		narrowReadingNoteRoute(readingNoteFixture({ family: "Construction" })),
	).toBeNull();
	expect(
		narrowReadingNoteRoute(readingNoteFixture({ kind: "Unknown" })),
	).toBeNull();
});

test("dispatches malformed routes to an Error Note before Block rendering", () => {
	const markup = renderToStaticMarkup(
		renderReadingNote(readingNoteFixture({ kind: "Unknown" })),
	);
	expect(markup).toContain("Reading Note unavailable");
	expect(markup).toContain("Unsupported Reading route: de/Lexeme/Unknown.");
	expect(markup).not.toContain('aria-label="Reading note"');
});

test("keeps Page Navigation in the shell while modeled defaults stay invisible", () => {
	const markup = renderToStaticMarkup(
		createElement(
			MemoryRouter,
			{},
			renderReadingNote(readingNoteFixture()),
		),
	);
	expect(markup).toContain('aria-label="Primary"');
	expect(markup).toContain('aria-label="Reading note"');
	expect(markup).not.toContain("unavailable");

	const context = renderContext();
	expect(
		renderReadingNoteBlocks(context, new Set(["Header", "Definition"]), {}),
	).toHaveLength(1);
	expect(
		renderReadingNoteBlocks(context, new Set(["Definition"]), {}),
	).toHaveLength(0);
	expect(Object.keys(DEFAULT_READING_NOTE_RENDERER_FOR)).toHaveLength(7);
});

test("renders the four visible defaults in weighted order with navigable targets", () => {
	const base = readingNoteFixture({
		canonicalForm: "Bank",
		transcription: "baŋk",
		coreFeatures: { gender: "Fem" },
	});
	const note: ReadingNoteData = {
		...base,
		knowledge: {
			...base.knowledge,
			definition: "This remains intentionally invisible.",
			translations: { en: ["bank"] },
		},
		relations: [
			{
				relation: "synonym",
				targetCanonicalForm: "Institut",
				target: {
					kind: "RouteNote",
					routeKind: "Lemma",
					id: "lemma-1" as never,
				},
			},
		],
		pendingRelations: [
			{
				locatorKey: "pending-1",
				relation: "antonym",
				targetCanonicalForm: "Sparkasse",
				targetFamily: "Lexeme",
				targetKind: "NOUN",
				target: {
					kind: "ShadowNote",
					shadowId: "shadow-1" as never,
				},
			},
		],
		sourceContexts: {
			page: [sourceContext("attestation-1", "A source sentence.")],
			continueCursor: "",
			isDone: true,
		},
	};
	const markup = renderPublicReadingNote(note);

	expect(markup.indexOf('id="reading-note-title"')).toBeLessThan(
		markup.indexOf('id="source-contexts"'),
	);
	expect(markup.indexOf('id="source-contexts"')).toBeLessThan(
		markup.indexOf('aria-label="Semantic relations"'),
	);
	expect(markup.indexOf('aria-label="Semantic relations"')).toBeLessThan(
		markup.indexOf('id="translations"'),
	);
	expect(markup).toContain("🏦 Bank");
	expect(markup).toContain("/baŋk/");
	expect(markup).toContain("gender: Fem");
	expect(markup).toContain("/text/text-1?at=attestation-1");
	expect(markup).toContain("/note/route/lemma/lemma-1");
	expect(markup).toContain("/note/shadow/shadow-1");
	expect(markup).toContain("relation to Unit Shadow Sparkasse");
	expect(markup).not.toContain("unresolved Reading");
	expect(markup).toContain("en: bank");
	expect(markup).not.toContain("This remains intentionally invisible.");
});

test("applies visitor Knowledge Settings in React without reshaping NoteData", () => {
	const base = readingNoteFixture({ transcription: "baŋk" });
	const note: ReadingNoteData = {
		...base,
		knowledge: {
			...base.knowledge,
			translations: { en: ["bank"] },
		},
		relations: [
			{
				relation: "synonym",
				targetCanonicalForm: "Institut",
				target: {
					kind: "RouteNote",
					routeKind: "Lemma",
					id: "lemma-1" as never,
				},
			},
		],
	};
	const defaults = createDefaultReadingNoteCapabilities(note);
	const markup = renderPublicReadingNote(note, {
		...defaults,
		knowledgeSettings: {
			...defaults.knowledgeSettings,
			transcription: false,
			translations: { en: false },
			semanticRelations: {
				...defaults.knowledgeSettings.semanticRelations,
				synonym: false,
			},
		},
	});

	expect(note.knowledge.transcription).toBe("baŋk");
	expect(note.knowledge.translations?.en).toEqual(["bank"]);
	expect(note.relations).toHaveLength(1);
	expect(markup).not.toContain("/baŋk/");
	expect(markup).not.toContain("en: bank");
	expect(markup).not.toContain("Semantic relations");
});

test("renders Source Context pagination loading and failure state from capabilities", () => {
	const note = readingNoteFixture();
	const defaults = createDefaultReadingNoteCapabilities(note);
	const capabilities: ReadingNotePresentationCapabilities = {
		...defaults,
		sourceContexts: {
			items: [sourceContext("attestation-1", "Loaded context.")],
			hasMore: true,
			isLoading: true,
			error: "Source Context page failed.",
			loadMore: async () => {},
		},
	};
	const markup = renderPublicReadingNote(note, capabilities);

	expect(markup).toContain("Loaded context.");
	expect(markup).toContain("Loading…");
	expect(markup).toContain("disabled");
	expect(markup).toContain('role="alert"');
	expect(markup).toContain("Source Context page failed.");
});

test("orders applicable Blocks by shared weights and prefers a sparse override", () => {
	const context = renderContext();
	let overrideReceivedContext = false;
	const overrides = {
		Lexeme: {
			NOUN: {
				Relations(received) {
					overrideReceivedContext = received === context;
					return createElement("span", {
						"data-block": "Relations override",
					});
				},
			},
		},
	} satisfies ReadingNoteRendererOverrideRegistry<"de">;
	const blocks = renderReadingNoteBlocks(
		context,
		new Set(["Definition", "Relations", "Header", "Translations"]),
		overrides,
		markerRenderers(),
	);
	const markup = renderToStaticMarkup(createElement(Fragment, {}, ...blocks));

	expect(overrideReceivedContext).toBeTrue();
	expect(markup.indexOf("Header default")).toBeLessThan(
		markup.indexOf("Relations override"),
	);
	expect(markup.indexOf("Relations override")).toBeLessThan(
		markup.indexOf("Translations default"),
	);
	expect(markup.indexOf("Translations default")).toBeLessThan(
		markup.indexOf("Definition default"),
	);
	expect(markup).not.toContain("Relations default");
	expect(
		blocks.every(({ type }) => type === ReadingNoteBlockErrorBoundary),
	).toBe(true);
});

test("German renderer index exposes only the Lexeme VERB Header specialization", () => {
	expect(Object.keys(deReadingNoteModule.rendererOverrides)).toEqual([
		"Lexeme",
	]);
	expect(
		Object.keys(deReadingNoteModule.rendererOverrides.Lexeme?.VERB ?? {}),
	).toEqual(["Header"]);
});

test("renders the specialized German verb Header through the public Reading renderer", () => {
	const ordinary = renderPublicReadingNote(
		readingNoteFixture({
			kind: "VERB",
			canonicalForm: "rennen",
			emojiDescription: "🏃",
			transcription: "ˈʁɛnən",
			coreFeatures: verbFeatures(),
		}),
	);
	const reflexive = renderPublicReadingNote(
		readingNoteFixture({
			kind: "VERB",
			canonicalForm: "sich duschen",
			emojiDescription: "🚿",
			coreFeatures: verbFeatures({ lexicallyReflexive: "Yes" }),
		}),
	);
	const separable = renderPublicReadingNote(
		readingNoteFixture({
			kind: "VERB",
			canonicalForm: "aufpassen",
			emojiDescription: "🤱",
			coreFeatures: verbFeatures({
				hasGovPrep: "auf",
				hasSepPrefix: "auf",
			}),
		}),
	);

	expect(ordinary).toContain("🏃");
	expect(ordinary).toContain("rennen");
	expect(ordinary).toContain("/ˈʁɛnən/");
	expect(reflexive).toContain(
		'<span class="text-muted-foreground">sich </span>duschen',
	);
	expect(separable).toContain(
		'auf<span class="text-muted-foreground">|</span>passen',
	);
	expect(separable).toContain(">auf</span>");
});

test("German verb Header treats governed prepositions and separable prefixes independently", () => {
	const prefixOnly = renderPublicReadingNote(
		readingNoteFixture({
			kind: "VERB",
			canonicalForm: "aufstehen",
			coreFeatures: verbFeatures({ hasSepPrefix: "auf" }),
		}),
	);
	const prepositionOnly = renderPublicReadingNote(
		readingNoteFixture({
			kind: "VERB",
			canonicalForm: "warten",
			coreFeatures: verbFeatures({ hasGovPrep: "auf" }),
		}),
	);

	expect(prefixOnly).toContain(
		'auf<span class="text-muted-foreground">|</span>stehen',
	);
	expect(prefixOnly).not.toContain(">auf</span>");
	expect(prepositionOnly).toContain("warten");
	expect(prepositionOnly).not.toContain(
		'<span class="text-muted-foreground">|</span>',
	);
	expect(prepositionOnly).toContain(">auf</span>");
});

test("German verb specialization leaves other Blocks on exhaustive defaults", () => {
	const context = renderContext({
		kind: "VERB",
		canonicalForm: "rennen",
		coreFeatures: verbFeatures(),
	});
	const blocks = renderReadingNoteBlocks(
		context,
		new Set(["Header", "SourceContexts", "Relations", "Translations"]),
		deReadingNoteModule.rendererOverrides,
		markerRenderers(),
	);
	const markup = renderToStaticMarkup(createElement(Fragment, {}, ...blocks));

	expect(markup).toContain("rennen");
	expect(markup).not.toContain("Header default");
	expect(markup).toContain("SourceContexts default");
	expect(markup).toContain("Relations default");
	expect(markup).toContain("Translations default");
});

test("isolates an invoked renderer failure without hiding successful siblings", () => {
	const defaults = markerRenderers();
	defaults.Relations = () => {
		throw new Error("Relations exploded");
	};
	const blocks = renderReadingNoteBlocks(
		renderContext(),
		new Set(["Relations", "Header"]),
		{},
		defaults,
	);
	const markup = renderToStaticMarkup(createElement(Fragment, {}, ...blocks));

	expect(markup).toContain("Header default");
	expect(markup).toContain("Relations unavailable");
	expect(markup).toContain("Relations exploded");
});

test("resets a failed Block boundary when reactive render input changes", () => {
	const failedToken = {};
	const nextToken = {};
	const initialState = {
		hasError: false,
		cause: undefined,
		resetToken: failedToken,
	};
	const failedState = {
		...initialState,
		...ReadingNoteBlockErrorBoundary.getDerivedStateFromError(
			new Error("temporary failure"),
		),
	};

	expect(
		ReadingNoteBlockErrorBoundary.getDerivedStateFromProps(
			{
				blockKind: "SourceContexts",
				resetToken: failedToken,
				children: null,
			},
			failedState,
		),
	).toBeNull();
	expect(
		ReadingNoteBlockErrorBoundary.getDerivedStateFromProps(
			{
				blockKind: "SourceContexts",
				resetToken: nextToken,
				children: null,
			},
			failedState,
		),
	).toEqual({ hasError: false, cause: undefined, resetToken: nextToken });
});

test("resets, merges, and deduplicates reactive Source Context pages", () => {
	const first = {
		...readingNoteFixture(),
		sourceContexts: {
			page: [sourceContext("attestation-1", "First.")],
			continueCursor: "cursor-1",
			isDone: false,
		},
	};
	const initial = resetSourceContextPagination(first);
	expect(initial).toMatchObject({
		additionalSourceContexts: [],
		cursor: "cursor-1",
		isDone: false,
		isLoading: false,
	});

	const next = {
		...first,
		sourceContexts: {
			page: [
				sourceContext("attestation-1", "Duplicate."),
				sourceContext("attestation-2", "Second."),
				sourceContext("attestation-2", "Duplicate second."),
			],
			continueCursor: "",
			isDone: true,
		},
	};
	const merged = mergeSourceContextPage(initial, next);
	const visible = deduplicateSourceContexts([
		...first.sourceContexts.page,
		...merged.additionalSourceContexts,
	]);
	expect(visible.map(({ attestationId }) => attestationId)).toEqual([
		"attestation-1",
		"attestation-2",
	]);
	expect(merged).toMatchObject({ cursor: "", isDone: true });

	const reactive = {
		...first,
		sourceContexts: {
			page: [sourceContext("attestation-3", "Reactive first page.")],
			continueCursor: "cursor-reactive",
			isDone: false,
		},
	};
	const reset = resetSourceContextPagination(reactive);
	expect(reset.additionalSourceContexts).toEqual([]);
	expect(reset.cursor).toBe("cursor-reactive");
	expect(reset.firstPageKey).not.toBe(initial.firstPageKey);
});

test("ignores stale Source Context errors and preserves Definition mutation planning", () => {
	expect(
		sourceContextPageFailureMessage(new Error("old failure"), 1, 2),
	).toBeNull();
	expect(
		sourceContextPageFailureMessage(new Error("current failure"), 2, 2),
	).toBe("current failure");

	const absent = readingNoteFixture();
	expect(
		readingDefinitionMutationArgs(absent, "  Neue Definition  ", "key-1"),
	).toEqual({
		knowledgeChangeKey: "key-1",
		ownerReadingKey: "reading-key",
		change: {
			kind: "Contribute",
			aspect: "definition",
			value: "Neue Definition",
		},
	});
	const defined: ReadingNoteData = {
		...absent,
		knowledge: { ...absent.knowledge, definition: "Alt" },
	};
	expect(readingDefinitionMutationArgs(defined, "", "key-2")?.change).toEqual(
		{ kind: "Retract", aspect: "definition" },
	);
	expect(readingDefinitionMutationArgs(defined, " Alt ", "key-3")).toBeNull();
});

function renderContext(): ReadingNoteRenderContext<"de", "Lexeme", "NOUN">;
function renderContext(
	route: ReadingNoteFixtureOptions & { readonly kind: "VERB" },
): ReadingNoteRenderContext<"de", "Lexeme", "VERB">;
function renderContext(
	route: ReadingNoteFixtureOptions = {},
): ReadingNoteRenderContext<"de", "Lexeme", "NOUN" | "VERB"> {
	const note = readingNoteFixture(route);
	const kind = route.kind ?? "NOUN";
	return {
		note,
		route: { targetLanguage: "de", family: "Lexeme", kind },
		capabilities: createDefaultReadingNoteCapabilities(note),
	};
}

function renderPublicReadingNote(
	note: ReadingNoteData,
	capabilities?: ReadingNotePresentationCapabilities,
): string {
	return renderToStaticMarkup(
		createElement(MemoryRouter, {}, renderNote(note, capabilities)),
	);
}

function markerRenderers(): Record<
	NoteBlockKindFor<"UnitReadingNote">,
	ReadingNoteDefaultRenderer
> {
	return Object.fromEntries(
		Object.keys(DEFAULT_READING_NOTE_RENDERER_FOR).map((blockKind) => [
			blockKind,
			() =>
				createElement("span", {
					"data-block": `${blockKind} default`,
				}),
		]),
	) as Record<
		NoteBlockKindFor<"UnitReadingNote">,
		ReadingNoteDefaultRenderer
	>;
}

type ReadingNoteFixtureOptions = Partial<{
	language: string;
	family: string;
	kind: string;
	canonicalForm: string;
	emojiDescription: string;
	transcription: string | null;
	coreFeatures: Readonly<Record<string, string | null>>;
}>;

function readingNoteFixture(
	route: ReadingNoteFixtureOptions = {},
): ReadingNoteData {
	const canonicalForm = route.canonicalForm ?? "Bank";
	return {
		kind: "UnitReadingNote",
		target: { kind: "UnitReadingNote", readingId: "reading-1" as never },
		reading: {
			ownerKind: "Reading",
			ownerKey: "reading-key",
			readingId: "reading-1" as never,
			emojiDescription: route.emojiDescription ?? "🏦",
			lemma: {
				ownerKind: "Lemma",
				ownerKey: "lemma-key",
				language: route.language ?? "de",
				family: route.family ?? "Lexeme",
				kind: route.kind ?? "NOUN",
				canonicalForm,
				coreFeatures: route.coreFeatures ?? {},
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		knowledge: {
			...(route.transcription
				? { transcription: route.transcription }
				: {}),
		},
		knowledgeUpdatedAt: null,
		relations: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: { page: [], continueCursor: "", isDone: true },
	} as unknown as ReadingNoteData;
}

function verbFeatures(
	overrides: Partial<{
		hasGovPrep: string | null;
		hasSepPrefix: string | null;
		lexicallyReflexive: string | null;
		verbType: string | null;
	}> = {},
) {
	return {
		hasGovPrep: null,
		hasSepPrefix: null,
		lexicallyReflexive: null,
		verbType: null,
		...overrides,
	};
}

function sourceContext(attestationId: string, sentenceSnippet: string) {
	return {
		attestationId: attestationId as never,
		textId: "text-1" as never,
		sentencePosition: 0,
		sentenceSnippet,
		memberSegmentIndices: [1],
		target: {
			kind: "Text" as const,
			textId: "text-1" as never,
			focusAttestationId: attestationId as never,
		},
	};
}
