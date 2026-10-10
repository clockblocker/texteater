import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../convex/_generated/dataModel";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import {
	resolutionDeckCards,
	segmentSelectionDeckCards,
} from "../src/views/resolution-deck";
import { ResolutionStepNoteFrame } from "../src/views/resolution-note-view";
import { resolvingReadingNoteData } from "../src/views/resolving-reading-note";
import { type NotePart, NotePartProvider } from "../src/workspace/note-part";
import { WorkspaceInteractionProvider } from "../src/workspace/workspace-controller";

const route = {
	textId: "text-1" as Id<"texts">,
	sentenceId: "sentence-1" as Id<"sentences">,
	stitchedText: "Die Banken.",
	clickedSegmentIndex: 2,
	selectedSegment: "Banken",
};

const source = {
	segments: [
		{ kind: "ResolvableText" as const, text: "Die" },
		{ kind: "Whitespace" as const, text: " " },
		{ kind: "ResolvableText" as const, text: "Banken" },
		{ kind: "Punctuation" as const, text: "." },
	],
	memberSegmentIndices: [2],
	textTitle: "Die Banken.",
};

const grammar = {
	members: [{ attested: "Banken", orthography: "Standard" as const }],
	valencyMembers: [],
	realizationCoverage: "Full" as const,
	normalizedSurface: "Banken",
	spelling: { kind: "Canonical" as const },
	grundform: false,
	canonicalForm: "Bank",
	family: "Lexeme" as const,
	kind: "NOUN" as const,
	coreFeatures: { gender: "Fem" as const },
};

const reading = {
	emojiDescription: "🏦",
	canonicalForm: "Bank",
	family: "Lexeme" as const,
	kind: "NOUN" as const,
};

const unit = {
	segments: [0, 2],
	route: {
		language: "de" as const,
		family: "Lexeme" as const,
		kind: "NOUN" as const,
	},
};

const resolutionTarget = {
	kind: "Resolution" as const,
	requestId: "request-1",
};

function stepKeys(cards: ReturnType<typeof resolutionDeckCards>) {
	return cards.map(({ key }) => key);
}

function renderResolving(
	note: Parameters<typeof resolvingReadingNoteData>[0]["note"],
	unitRoute?: typeof unit.route,
) {
	const noteData = resolvingReadingNoteData({
		requestId: "request-1",
		note,
		...(unitRoute ? { unitRoute } : {}),
	});
	if (!noteData) throw new Error("A route is required");
	return renderToStaticMarkup(
		renderNote({
			noteData,
			capabilities: {
				presentation: "Card",
				knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
				sourceContexts: {
					items: noteData.sourceContexts.page,
					hasMore: false,
					isLoading: false,
					error: null,
					loadMore: null,
				},
				personalAnnotation: {
					isSaving: false,
					error: null,
					save: null,
				},
				follow: () => {},
			},
		}),
	);
}

/** A step's Frame, as the Compass draws the part given. */
function renderStep(
	props: Omit<
		Parameters<typeof ResolutionStepNoteFrame>[0],
		"requestId" | "presentation"
	>,
	part: NotePart | null = null,
) {
	const frame = createElement(ResolutionStepNoteFrame, {
		...props,
		requestId: "request-1",
		presentation: "Card",
	});
	return renderToStaticMarkup(
		createElement(WorkspaceInteractionProvider, {
			interaction: { follow: () => {}, presentCards: () => {} },
			children:
				part === null
					? frame
					: createElement(NotePartProvider, { value: part }, frame),
		}),
	);
}

test("a running Resolution deals its Reading and Attestation steps under the keys they keep", () => {
	for (const progress of [
		"Starting",
		"RouteAvailable",
		"GrammarAvailable",
		"ReadingAvailable",
		"Committing",
	] as const) {
		const cards = resolutionDeckCards({
			kind: "ResolutionNote",
			target: resolutionTarget,
			lifecycle: { state: "Active", progress, activity: "Running" },
			route,
			source,
			unit,
			...(progress === "Starting" || progress === "RouteAvailable"
				? {}
				: { grammar }),
			updatedAt: 1,
		});
		expect(cards).toEqual([
			{
				key: "request-1:Reading",
				target: {
					kind: "ResolutionStep",
					requestId: "request-1",
					stepKind: "Reading",
				},
				presentationContext: { unitRoute: unit.route },
			},
			{
				key: "request-1:Attestation",
				target: {
					kind: "ResolutionStep",
					requestId: "request-1",
					stepKind: "Attestation",
				},
			},
		]);
	}
});

test("a Session that ends without an occurrence keeps the steps it dealt", () => {
	for (const lifecycle of [
		{
			state: "Terminal",
			progress: "GrammarAvailable",
			outcome: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "diagnostic-1",
			message: "Reading is temporarily unavailable.",
		},
		{
			state: "Terminal",
			progress: "RouteAvailable",
			outcome: "Unresolved",
		},
	] as const)
		expect(
			stepKeys(
				resolutionDeckCards({
					kind: "ResolutionNote",
					target: resolutionTarget,
					lifecycle,
					route,
					source,
					unit,
					updatedAt: 5,
				}),
			),
		).toEqual(["request-1:Reading", "request-1:Attestation"]);
});

test("a completed Resolution converges the deck to canonical Notes", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as Id<"attestations">,
			readingId: "reading-1" as Id<"readings">,
			canonical: {
				readingId: "reading-1" as Id<"readings">,
				lemmaId: "lemma-1" as Id<"lemmas">,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId: "surface-1" as Id<"surfaces">,
				attestationId: "attestation-1" as Id<"attestations">,
				steps: { attestation: true, surface: true, lemma: true },
			},
		},
		route,
		source,
		grammar,
		reading,
		updatedAt: 5,
	});

	expect(cards).toEqual([
		expect.objectContaining({
			target: { kind: "Reading", readingId: "reading-1" },
		}),
		expect.objectContaining({
			target: { kind: "Lemma", lemmaId: "lemma-1" },
		}),
		{
			key: "request-1:Surface",
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "Banken",
			},
			presentationContext: { activeAnalysisKey: "surface-1" },
		},
		expect.objectContaining({
			target: {
				kind: "Attestation",
				attestationId: "attestation-1",
			},
		}),
	]);
});

test("a converged deck hands the Resolution to the stored Reading Card", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as Id<"attestations">,
			readingId: "reading-1" as Id<"readings">,
			canonical: {
				readingId: "reading-1" as Id<"readings">,
				lemmaId: "lemma-1" as Id<"lemmas">,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId: "surface-1" as Id<"surfaces">,
				attestationId: "attestation-1" as Id<"attestations">,
				steps: { attestation: true, surface: true, lemma: true },
			},
		},
		route,
		source,
		grammar,
		reading,
		updatedAt: 5,
	});
	expect(cards[0]).toEqual({
		key: "request-1:Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		presentationContext: { resolutionRequestId: "request-1" },
	});
});

test("a stored Resolution whose every step says something opens all four canonical Card subjects", () => {
	// Branded Convex ids; the deck only passes them through.
	const readingId = "reading-1" as Id<"readings">;
	const lemmaId = "lemma-1" as Id<"lemmas">;
	const surfaceId = "surface-1" as Id<"surfaces">;
	const attestationId = "attestation-1" as Id<"attestations">;
	const canonical = {
		readingId,
		lemmaId,
		surfaceLanguage: "de" as const,
		normalizedSurface: "Banken",
		surfaceId,
		attestationId,
		steps: { attestation: true, surface: true, lemma: true },
	};
	const cards = segmentSelectionDeckCards("request-available", {
		kind: "Available",
		canonical,
	});

	expect(cards.map(({ target }) => target)).toEqual([
		{ kind: "Reading", readingId },
		{ kind: "Lemma", lemmaId },
		{ kind: "Surface", language: "de", normalizedSurface: "Banken" },
		{ kind: "Attestation", attestationId },
	]);
	expect(cards[2]?.presentationContext).toEqual({
		activeAnalysisKey: surfaceId,
	});

	// A repeat click joins the running session, whose requestId differs.
	expect(
		segmentSelectionDeckCards("request-repeat", {
			kind: "Resolving",
			requestId: "request-running",
			progress: "GrammarAvailable",
			activity: "Running",
			deduplicated: true,
			unitRoute: unit.route,
			unitSegments: unit.segments,
		}),
	).toEqual([
		{
			key: "request-running:Reading",
			target: {
				kind: "ResolutionStep",
				requestId: "request-running",
				stepKind: "Reading",
			},
			presentationContext: { unitRoute: unit.route },
		},
		{
			key: "request-running:Attestation",
			target: {
				kind: "ResolutionStep",
				requestId: "request-running",
				stepKind: "Attestation",
			},
		},
	]);
	// An Unresolved unit lays the Reading out by no route, and a unit of
	// the clicked word alone deals no Attestation until Grammar reads it.
	expect(
		segmentSelectionDeckCards("request-unresolved", {
			kind: "Resolving",
			requestId: "request-unresolved",
			progress: "Starting",
			activity: "Scheduled",
			deduplicated: false,
			unitRoute: "Unresolved",
			unitSegments: [2],
		}),
	).toEqual([
		{
			key: "request-unresolved:Reading",
			target: {
				kind: "ResolutionStep",
				requestId: "request-unresolved",
				stepKind: "Reading",
			},
		},
	]);
});

test("before the Session's first result, the Reading step is laid out by the clicked unit's route", () => {
	const markup = renderResolving(null, unit.route);
	expect(markup).toContain('data-note-kind="Reading"');
	expect(markup).toContain('aria-label="Headword on the way"');
	expect(markup).toContain('aria-label="Emoji on the way"');
	expect(markup).toMatch(
		/aria-label="Source Contexts"[^>]*aria-busy="true"|aria-busy="true"[^>]*aria-label="Source Contexts"/,
	);
	// The route is named where the stored Note names it: in its tags.
	expect(markup).toMatch(
		/<span>de<\/span><span>Lexeme<\/span><span>NOUN<\/span>/,
	);
});

test("before Grammar, the Reading step is headed by the clicked words, resolving", () => {
	const markup = renderResolving({
		kind: "ResolutionNote",
		target: resolutionTarget,
		lifecycle: {
			state: "Active",
			progress: "RouteAvailable",
			activity: "Running",
		},
		route,
		source: { ...source, memberSegmentIndices: [0, 2] },
		unit,
		updatedAt: 1,
	});
	expect(markup).toMatch(/data-resolving="true"[^>]*>Die Banken</);
	expect(markup).toContain("word-sheen");
	expect(markup).toContain("<span>NOUN</span>");
	expect(markup).not.toContain("Headword on the way");
	expect(markup).toContain("Banken</button>");
});

test("with no route known, the Reading step shows a Reading Note's bones under the clicked words", () => {
	const note = {
		kind: "ResolutionNote" as const,
		target: resolutionTarget,
		lifecycle: {
			state: "Active" as const,
			progress: "RouteAvailable" as const,
			activity: "Running" as const,
		},
		route,
		source,
		updatedAt: 1,
	};
	expect(renderStep({ stepKind: "Reading", note: null }, "body")).toContain(
		'aria-label="Loading Reading Note"',
	);
	expect(
		renderStep({ stepKind: "Attestation", note: null }, "body"),
	).toContain('aria-label="Loading Attestation Note"');
	expect(renderStep({ stepKind: "Reading", note }, "heading")).toMatch(
		/data-resolving="true"[^>]*>Banken</,
	);
});

test("the Attestation step captions what Grammar read its words as", () => {
	const note = {
		kind: "ResolutionNote" as const,
		target: resolutionTarget,
		lifecycle: {
			state: "Active" as const,
			progress: "GrammarAvailable" as const,
			activity: "Running" as const,
		},
		route,
		source,
		updatedAt: 1,
	};
	const words = (markup: string) => markup.replaceAll(/<[^>]+>/g, "");
	// Before Grammar has read the words, the title stands alone.
	expect(
		words(renderStep({ stepKind: "Attestation", note }, "heading")),
	).toBe("Banken");
	const typo = renderStep(
		{
			stepKind: "Attestation",
			note: {
				...note,
				grammar: {
					...grammar,
					members: [{ attested: "Bankne", orthography: "Typo" }],
				},
			},
		},
		"heading",
	);
	expect(words(typo)).toBe("Banken·typo of Banken");
	expect(typo).toContain(
		'data-caption-next="" class="text-ink-faint">Banken<',
	);
});

test("the Attestation step titles the clicked words and quotes their sentence, its route on the way", () => {
	const note = {
		kind: "ResolutionNote" as const,
		target: resolutionTarget,
		lifecycle: {
			state: "Active" as const,
			progress: "RouteAvailable" as const,
			activity: "Running" as const,
		},
		route,
		source,
		updatedAt: 1,
	};
	const heading = renderStep({ stepKind: "Attestation", note }, "heading");
	expect(heading).toContain('data-attestation-title=""><bdi>Banken</bdi><');
	expect(heading).not.toContain('role="status"');
	const body = renderStep({ stepKind: "Attestation", note }, "body");
	expect(body).toContain('data-note-kind="Attestation"');
	expect(body).toContain("Banken</button>");
	expect(body).toMatch(/aria-label="Route"[^>]*aria-busy="true"/);
	expect(body).not.toContain(">Banken</h");

	// A failed Session has nothing more on its way.
	const failed = renderStep(
		{
			stepKind: "Attestation",
			note: {
				...note,
				lifecycle: {
					state: "Terminal",
					progress: "RouteAvailable",
					outcome: "Unresolved",
				},
			},
		},
		"body",
	);
	expect(failed).not.toContain("aria-busy");
});

test("a Session that ended without an occurrence shows why in the Reading step", () => {
	const base = {
		kind: "ResolutionNote" as const,
		target: resolutionTarget,
		route,
		source: { ...source, memberSegmentIndices: [0, 2] },
		updatedAt: 2,
	};
	const unresolved = {
		...base,
		unit,
		lifecycle: {
			state: "Terminal" as const,
			progress: "RouteAvailable" as const,
			outcome: "Unresolved" as const,
		},
	};
	// The Heading names the unit, still, and the Body does not again.
	const heading = renderStep(
		{ stepKind: "Reading", note: unresolved },
		"heading",
	);
	expect(heading).toContain(">Die Banken<");
	expect(heading).not.toContain("word-sheen");
	const body = renderStep({ stepKind: "Reading", note: unresolved }, "body");
	expect(body).not.toContain("Die Banken");
	expect(body).toContain("This unit could not be resolved.");
	expect(body).not.toContain("Retry");
	expect(body).not.toContain('data-slot="note-skeleton"');
	expect(
		renderStep(
			{ stepKind: "Reading", note: { ...unresolved, unit: undefined } },
			"body",
		),
	).toContain("This Segment could not be resolved.");

	const failed = renderStep(
		{
			stepKind: "Reading",
			note: {
				...base,
				lifecycle: {
					state: "Terminal",
					progress: "GrammarAvailable",
					outcome: "PermanentFailure",
					failureCode: "ProviderUnavailable",
					diagnosticId: "diagnostic-1",
					message: "Reading is temporarily unavailable.",
				},
			},
			onRetry: async () => {},
		},
		"body",
	);
	expect(failed).toContain("Reading is temporarily unavailable.");
	expect(failed).toContain("diagnostic-1");
	expect(failed).toContain("Retry resolution");
});

test("the resolving Reading Note is the real Reading Note with bones for what has not arrived", () => {
	const base = {
		kind: "ResolutionNote" as const,
		target: { kind: "Resolution" as const, requestId: "request-1" },
		route,
		source,
		grammar,
	};
	// Without Grammar or a stored route, no route lays the Note out yet.
	expect(
		resolvingReadingNoteData({
			requestId: "request-1",
			note: {
				...base,
				lifecycle: {
					state: "Active",
					progress: "RouteAvailable",
					activity: "Running",
				},
				grammar: undefined,
				updatedAt: 1,
			},
		}),
	).toBeNull();

	const grammatical = renderResolving({
		...base,
		lifecycle: {
			state: "Active",
			progress: "GrammarAvailable",
			activity: "Running",
		},
		updatedAt: 2,
	});
	expect(grammatical).toContain('data-note-kind="Reading"');
	expect(grammatical).toContain('data-reading-title=""');
	expect(grammatical).toContain('data-gender="Fem"');
	expect(grammatical).toContain(">Bank<");
	expect(grammatical).toContain("note-arrival");
	expect(grammatical).not.toContain("word-sheen");
	expect(grammatical).toContain('aria-label="Emoji on the way"');
	expect(grammatical).not.toContain("open its Lemma");
	expect(grammatical).toContain('aria-label="Definition"');
	expect(grammatical).toContain('aria-label="Translations"');
	expect(grammatical).toMatch(
		/aria-label="Translations"[\s\S]*aria-busy="true"/,
	);
	expect(grammatical).toMatch(
		/<span data-slot="reader-plain-segment"[^>]*>Die <\/span><button data-slot="reader-segment"[^>]*>Banken<\/button><span data-slot="reader-plain-segment"[^>]*>\.<\/span>/,
	);

	const readable = renderResolving({
		...base,
		lifecycle: {
			state: "Active",
			progress: "ReadingAvailable",
			activity: "Running",
		},
		reading,
		updatedAt: 3,
	});
	expect(readable).not.toContain("Emoji on the way");
	expect(readable).toContain("🏦");
	expect(readable).toContain("note-arrival");
	expect(readable).not.toContain("open its Lemma");
});

test("the resolving Reading Note quotes the clicked occurrence of a repeated word", () => {
	const markup = renderResolving({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "GrammarAvailable",
			activity: "Running",
		},
		route: {
			...route,
			stitchedText: "Banken und Banken.",
			clickedSegmentIndex: 4,
		},
		source: {
			segments: [
				{ kind: "ResolvableText", text: "Banken" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "und" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Banken" },
				{ kind: "Punctuation", text: "." },
			],
			memberSegmentIndices: [4],
			textTitle: "Banken und Banken.",
		},
		grammar,
		updatedAt: 1,
	});
	expect(markup).toMatch(
		/<span data-slot="reader-plain-segment"[^>]*>Banken und <\/span><button data-slot="reader-segment"[^>]*>Banken<\/button>/,
	);
});
