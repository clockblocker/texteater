import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import { resolutionDeckCards } from "../src/views/resolution-deck";
import { completionTarget } from "../src/views/resolution-note-state";
import {
	ResolutionNoteFrame,
	ResolutionStepNoteFrame,
} from "../src/views/resolution-note-view";
import { resolvingReadingNoteData } from "../src/views/resolving-reading-note";
import { segmentSelectionDeckCards } from "../src/views/segment-selection-deck";

const route = {
	textId: "text-1" as never,
	sentenceId: "sentence-1" as never,
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
};

const grammar = {
	members: [{ attested: "Banken", orthography: "Standard" as const }],
	realizationCoverage: "Full" as const,
	normalizedSurface: "Banken",
	spelling: "Canonical" as const,
	grundform: false,
	canonicalForm: "Bank",
	family: "Lexeme" as const,
	kind: "NOUN" as const,
	coreFeatures: { gender: "Fem" as const, hyph: null },
};

const reading = {
	emojiDescription: "🏦",
	canonicalForm: "Bank",
	family: "Lexeme" as const,
	kind: "NOUN" as const,
};

test("active Resolution presentations use final-Note skeletons instead of WIP content", () => {
	const markup = renderToStaticMarkup(
		createElement(ResolutionNoteFrame, {
			note: {
				kind: "ResolutionNote",
				target: { kind: "Resolution", requestId: "request-1" },
				lifecycle: {
					state: "Active",
					progress: "ReadingAvailable",
					activity: "Running",
				},
				route,
				source,
				grammar,
				reading,
				updatedAt: 1,
			},
			presentation: "Card",
		}),
	);

	expect(markup).toContain('data-slot="note-skeleton"');
	expect(markup).toContain('aria-label="Loading Attestation Note"');
	expect(markup).not.toContain("Die Banken.");
	expect(markup).not.toContain("Reading Available");
});

test("each Resolution step uses the skeleton of its eventual Note", () => {
	const expected = {
		Attestation: "Loading Attestation Note",
		Surface: "Loading Surface Note",
		Lemma: "Loading Lemma Note",
		Reading: "Loading Reading Note",
	} as const;

	for (const [stepKind, label] of Object.entries(expected)) {
		const markup = renderToStaticMarkup(
			createElement(ResolutionStepNoteFrame, {
				stepKind: stepKind as keyof typeof expected,
				presentation: "Card",
			}),
		);

		expect(markup).toContain('data-slot="note-skeleton"');
		expect(markup).toContain(`aria-label="${label}"`);
		expect(markup).not.toContain("Die Banken.");
	}
});

test("projects each available Resolution step onto the front of one deck", () => {
	const starting = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "Starting",
			activity: "Running",
		},
		route,
		source,
		updatedAt: 1,
	});
	const routed = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "RouteAvailable",
			activity: "Running",
		},
		route,
		source,
		updatedAt: 2,
	});
	const grammatical = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "GrammarAvailable",
			activity: "Running",
		},
		route,
		source,
		grammar,
		updatedAt: 3,
	});
	const readable = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Active",
			progress: "ReadingAvailable",
			activity: "Running",
		},
		route,
		source,
		grammar,
		reading,
		updatedAt: 4,
	});

	expect(starting.map(({ target }) => target.kind)).toEqual(["Resolution"]);
	expect(stepKinds(routed)).toEqual(["Attestation"]);
	expect(stepKinds(grammatical)).toEqual([
		"Reading",
		"Lemma",
		"Surface",
		"Attestation",
	]);
	expect(stepKinds(readable)).toEqual([
		"Reading",
		"Lemma",
		"Surface",
		"Attestation",
	]);
});

test("a completed Resolution converges the deck to canonical Notes", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as never,
			target: {
				kind: "Reading",
				readingId: "reading-1" as never,
			},
			canonical: {
				readingId: "reading-1" as never,
				lemmaId: "lemma-1" as never,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId: "surface-1" as never,
				attestationId: "attestation-1" as never,
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

test("a stored Resolution opens the same four canonical Card subjects", () => {
	const canonical = {
		readingId: "reading-1",
		lemmaId: "lemma-1",
		surfaceLanguage: "de" as const,
		normalizedSurface: "Banken",
		surfaceId: "surface-1",
		attestationId: "attestation-1",
	};
	const cards = segmentSelectionDeckCards("request-available", {
		kind: "Available",
		target: { kind: "Reading", readingId: "reading-1" },
		canonical,
	});

	expect(cards.map(({ target }) => target)).toEqual([
		{ kind: "Reading", readingId: "reading-1" },
		{ kind: "Lemma", lemmaId: "lemma-1" },
		{ kind: "Surface", language: "de", normalizedSurface: "Banken" },
		{ kind: "Attestation", attestationId: "attestation-1" },
	]);
	expect(cards[2]?.presentationContext).toEqual({
		activeAnalysisKey: "surface-1",
	});

	const routeCards = segmentSelectionDeckCards("request-route", {
		kind: "Available",
		target: {
			kind: "Attestation",
			attestationId: "attestation-1",
		},
		canonical,
	});
	expect(routeCards.map(({ target }) => target.kind)).toEqual([
		"Attestation",
		"Reading",
		"Lemma",
		"Surface",
	]);
	expect(routeCards[0]?.target).toEqual({
		kind: "Attestation",
		attestationId: "attestation-1",
	});

	// A repeat click joins the running session, whose requestId differs.
	expect(
		segmentSelectionDeckCards("request-repeat", {
			kind: "Resolving",
			requestId: "request-running",
		}).map(({ target }) => target),
	).toEqual([{ kind: "Resolution", requestId: "request-running" }]);
});

test("a terminal failure keeps Resolution foremost without discarding reached steps", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "GrammarAvailable",
			outcome: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "diagnostic-1",
			message: "Reading is temporarily unavailable.",
		},
		route,
		source,
		grammar,
		updatedAt: 5,
	});

	expect(stepKinds(cards)).toEqual([
		"Resolution",
		"Lemma",
		"Surface",
		"Attestation",
	]);
});

test("completion reconciliation preserves its canonical Route Note target", () => {
	const note = {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as never,
			target: {
				kind: "Attestation",
				attestationId: "attestation-1" as never,
			},
		},
		route: {
			textId: "text-1" as never,
			sentenceId: "sentence-1" as never,
			stitchedText: "Die Banken.",
			clickedSegmentIndex: 2,
			selectedSegment: "Banken",
		},
		updatedAt: 1,
	} as const;
	expect(completionTarget(note)).toEqual({
		kind: "Attestation",
		attestationId: "attestation-1",
	});
});

function stepKinds(cards: ReturnType<typeof resolutionDeckCards>) {
	return cards.map(({ target }) =>
		target.kind === "ResolutionStep" ? target.stepKind : target.kind,
	);
}

function renderResolving(note: Parameters<typeof resolvingReadingNoteData>[0]) {
	const noteData = resolvingReadingNoteData(note);
	if (!noteData) throw new Error("Grammar is required");
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

test("the resolving Reading Note is the real Reading Note with bones for what has not arrived", () => {
	const base = {
		kind: "ResolutionNote" as const,
		target: { kind: "Resolution" as const, requestId: "request-1" },
		route,
		source,
		grammar,
	};
	expect(
		resolvingReadingNoteData({
			...base,
			lifecycle: {
				state: "Active",
				progress: "RouteAvailable",
				activity: "Running",
			},
			grammar: undefined,
			updatedAt: 1,
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
		},
		grammar,
		updatedAt: 1,
	});
	expect(markup).toMatch(
		/<span data-slot="reader-plain-segment"[^>]*>Banken und <\/span><button data-slot="reader-segment"[^>]*>Banken<\/button>/,
	);
});

test("the Reading step renders the resolving Note once Grammar is known and a skeleton before", () => {
	const before = renderToStaticMarkup(
		createElement(ResolutionStepNoteFrame, {
			stepKind: "Reading",
			presentation: "Card",
			note: {
				kind: "ResolutionNote",
				target: { kind: "Resolution", requestId: "request-1" },
				lifecycle: {
					state: "Active",
					progress: "RouteAvailable",
					activity: "Running",
				},
				route,
				source,
				updatedAt: 1,
			},
		}),
	);
	expect(before).toContain('aria-label="Loading Reading Note"');
});

test("a failed Session keeps its Grammar steps but drops the Reading step", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "GrammarAvailable",
			outcome: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "diagnostic-1",
			message: "Reading is temporarily unavailable.",
		},
		route,
		source,
		grammar,
		updatedAt: 5,
	});
	expect(stepKinds(cards)).not.toContain("Reading");
});

test("a converged deck hands the Resolution to the stored Reading Card", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as never,
			target: { kind: "Reading", readingId: "reading-1" as never },
			canonical: {
				readingId: "reading-1" as never,
				lemmaId: "lemma-1" as never,
				surfaceLanguage: "de",
				normalizedSurface: "Banken",
				surfaceId: "surface-1" as never,
				attestationId: "attestation-1" as never,
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
