import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolutionDeckCards } from "../src/views/resolution-deck";
import {
	completionTarget,
	ResolutionNoteFrame,
} from "../src/views/resolution-note-view";
import { segmentSelectionDeckCards } from "../src/views/segment-selection-deck";

const route = {
	textId: "text-1" as never,
	sentenceId: "sentence-1" as never,
	stitchedText: "Die Banken.",
	clickedSegmentIndex: 2,
	selectedSegment: "Banken",
};

const grammar = {
	members: [{ attested: "Banken", orthography: "Standard" as const }],
	realizationCoverage: "Full" as const,
	normalizedSurface: "Banken",
	spelling: "Canonical" as const,
	surfaceKind: "Inflection" as const,
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
};

const reading = {
	emojiDescription: "🏦",
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
};

test("renders learner-safe Resolution sections in lifecycle order", () => {
	const markup = renderToStaticMarkup(
		createElement(ResolutionNoteFrame, {
			note: {
				kind: "ResolutionNote",
				target: { kind: "Resolution", requestId: "request-1" },
				progress: "ReadingAvailable",
				activity: "Running",
				route,
				grammar,
				reading,
				updatedAt: 1,
			},
		}),
	);

	expect(markup.indexOf('aria-label="Source"')).toBeLessThan(
		markup.indexOf('aria-label="Grammar"'),
	);
	expect(markup.indexOf('aria-label="Grammar"')).toBeLessThan(
		markup.indexOf('aria-label="Reading"'),
	);
	expect(markup).toContain("Die Banken.");
	expect(markup).toContain("🏦 Bank");
	expect(markup).not.toContain("visitor");
	expect(markup).not.toContain("provider");
});

test("projects each available Resolution step onto the front of one deck", () => {
	const starting = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "Starting",
		activity: "Running",
		route,
		updatedAt: 1,
	});
	const routed = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "RouteAvailable",
		activity: "Running",
		route,
		updatedAt: 2,
	});
	const grammatical = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "GrammarAvailable",
		activity: "Running",
		route,
		grammar,
		updatedAt: 3,
	});
	const readable = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "ReadingAvailable",
		activity: "Running",
		route,
		grammar,
		reading,
		updatedAt: 4,
	});

	expect(starting.map(({ target }) => target.kind)).toEqual(["Resolution"]);
	expect(stepKinds(routed)).toEqual(["Attestation"]);
	expect(stepKinds(grammatical)).toEqual(["Lemma", "Surface", "Attestation"]);
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
		progress: "Committing",
		activity: "Terminal",
		outcome: "Complete",
		route,
		grammar,
		reading,
		terminal: {
			kind: "Complete",
			attestationId: "attestation-1" as never,
			target: {
				kind: "UnitReadingNote",
				readingId: "reading-1" as never,
			},
			canonical: {
				readingId: "reading-1" as never,
				lemmaId: "lemma-1" as never,
				surfaceId: "surface-1" as never,
				attestationId: "attestation-1" as never,
			},
		},
		updatedAt: 5,
	});

	expect(cards.map(({ target }) => target)).toEqual([
		{ kind: "UnitReadingNote", readingId: "reading-1" },
		{ kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		{ kind: "RouteNote", routeKind: "Surface", id: "surface-1" },
		{
			kind: "RouteNote",
			routeKind: "Attestation",
			id: "attestation-1",
		},
	]);
});

test("a stored Resolution opens the same four canonical Card subjects", () => {
	const canonical = {
		readingId: "reading-1",
		lemmaId: "lemma-1",
		surfaceId: "surface-1",
		attestationId: "attestation-1",
	};
	const cards = segmentSelectionDeckCards("request-available", {
		kind: "Available",
		target: { kind: "UnitReadingNote", readingId: "reading-1" },
		canonical,
	});

	expect(cards.map(({ target }) => target)).toEqual([
		{ kind: "UnitReadingNote", readingId: "reading-1" },
		{ kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		{ kind: "RouteNote", routeKind: "Surface", id: "surface-1" },
		{
			kind: "RouteNote",
			routeKind: "Attestation",
			id: "attestation-1",
		},
	]);

	const routeCards = segmentSelectionDeckCards("request-route", {
		kind: "Available",
		target: {
			kind: "RouteNote",
			routeKind: "Attestation",
			id: "attestation-1",
		},
		canonical,
	});
	expect(routeCards.map(({ target }) => target.kind)).toEqual([
		"RouteNote",
		"UnitReadingNote",
		"RouteNote",
		"RouteNote",
	]);
	expect(routeCards[0]?.target).toEqual({
		kind: "RouteNote",
		routeKind: "Attestation",
		id: "attestation-1",
	});
});

test("a terminal failure keeps Resolution foremost without discarding reached steps", () => {
	const cards = resolutionDeckCards({
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		progress: "GrammarAvailable",
		activity: "Terminal",
		outcome: "PermanentFailure",
		route,
		grammar,
		terminal: {
			kind: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "diagnostic-1",
			message: "Reading is temporarily unavailable.",
		},
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
		progress: "Committing",
		activity: "Terminal",
		outcome: "Complete",
		route: {
			textId: "text-1" as never,
			sentenceId: "sentence-1" as never,
			stitchedText: "Die Banken.",
			clickedSegmentIndex: 2,
			selectedSegment: "Banken",
		},
		terminal: {
			kind: "Complete",
			attestationId: "attestation-1" as never,
			target: {
				kind: "RouteNote",
				routeKind: "Attestation",
				id: "attestation-1" as never,
			},
		},
		updatedAt: 1,
	} as const;
	expect(completionTarget(note)).toEqual({
		kind: "RouteNote",
		routeKind: "Attestation",
		id: "attestation-1",
	});
});

function stepKinds(cards: ReturnType<typeof resolutionDeckCards>) {
	return cards.map(({ target }) =>
		target.kind === "ResolutionStep" ? target.stepKind : target.kind,
	);
}
