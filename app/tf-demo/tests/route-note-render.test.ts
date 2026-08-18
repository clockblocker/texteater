import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
	mergeRouteNotePages,
	type RouteNote,
	RouteNoteBody,
	resetRouteNotePagination,
	routePageFailureMessage,
} from "../src/views/route-note-view";

test("renders the complete Attestation route with typed link targets", () => {
	const note = {
		kind: "RouteNote",
		routeKind: "Attestation",
		target: {
			kind: "RouteNote",
			routeKind: "Attestation",
			id: "attestation-1",
		},
		source: {
			textId: "text-1",
			sentencePosition: 0,
			sentenceSnippet: "Er steht auf.",
			memberSegmentIndices: [1, 2],
			target: {
				kind: "Text",
				textId: "text-1",
				focusAttestationId: "attestation-1",
			},
		},
		members: [
			{ segmentIndex: 1, attested: "steht", orthography: "Standard" },
			{ segmentIndex: 2, attested: "auf", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		surface: {
			normalizedSurface: "steht auf",
			target: {
				kind: "RouteNote",
				routeKind: "Surface",
				id: "surface-1",
			},
		},
		reading: {
			emojiDescription: "🧍",
			canonicalForm: "aufstehen",
			target: { kind: "UnitReadingNote", readingId: "reading-1" },
		},
	} as RouteNote;
	const markup = renderBody(note);
	expect(markup).toContain("Er steht auf.");
	expect(markup).toContain('href="/text/text-1?at=attestation-1"');
	expect(markup).toContain('href="/note/route/surface/surface-1"');
	expect(markup).toContain('href="/note/reading/reading-1"');
});

test("renders Surface and Lemma traversal links, including polysemy and same-form travel", () => {
	const surface = {
		kind: "RouteNote",
		routeKind: "Surface",
		target: { kind: "RouteNote", routeKind: "Surface", id: "surface-1" },
		language: "de",
		normalizedSurface: "Bank",
		spelling: "Canonical",
		surfaceKind: "Citation",
		surfaceFeatures: [],
		inflectionalFeatures: [],
		lemma: {
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
			target: { kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		},
		connections: {
			occurrences: [
				{
					attestationId: "attestation-1",
					sentenceSnippet: "Die Bank.",
					members: ["Bank"],
					target: {
						kind: "RouteNote",
						routeKind: "Attestation",
						id: "attestation-1",
					},
				},
			],
			sameWrittenForm: [
				{
					surfaceId: "surface-2",
					normalizedSurface: "Bank",
					canonicalForm: "banken",
					family: "Lexeme",
					kind: "VERB",
					target: {
						kind: "RouteNote",
						routeKind: "Surface",
						id: "surface-2",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	} as RouteNote;
	const lemma = {
		kind: "RouteNote",
		routeKind: "Lemma",
		target: { kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		lemmaKind: "NOUN",
		coreFeatures: [],
		connections: {
			surfaces: [
				{
					surfaceId: "surface-1",
					normalizedSurface: "Bank",
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					target: {
						kind: "RouteNote",
						routeKind: "Surface",
						id: "surface-1",
					},
				},
			],
			readings: ["reading-1", "reading-2"].map((readingId) => ({
				readingId,
				emojiDescription: readingId === "reading-1" ? "🏦" : "🪑",
				target: { kind: "UnitReadingNote", readingId },
			})),
			sameWrittenForm: [
				{
					lemmaId: "lemma-2",
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "VERB",
					coreFeatures: [],
					target: {
						kind: "RouteNote",
						routeKind: "Lemma",
						id: "lemma-2",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	} as RouteNote;
	const surfaceMarkup = renderBody(surface);
	const lemmaMarkup = renderBody(lemma);
	expect(surfaceMarkup).toContain('href="/note/route/lemma/lemma-1"');
	expect(surfaceMarkup).toContain(
		'href="/note/route/attestation/attestation-1"',
	);
	expect(surfaceMarkup).toContain('href="/note/route/surface/surface-2"');
	expect(lemmaMarkup).toContain('href="/note/reading/reading-1"');
	expect(lemmaMarkup).toContain('href="/note/reading/reading-2"');
	expect(lemmaMarkup).toContain('href="/note/route/lemma/lemma-2"');
});

test("page merging deduplicates connections and a reactive first page resets cursor state", () => {
	const first = lemmaPage("cursor-old", false, ["reading-1"]);
	const continuation = lemmaPage("cursor-next", false, [
		"reading-1",
		"reading-2",
	]);
	const merged = mergeRouteNotePages(first, continuation);
	if (merged.routeKind !== "Lemma") throw new Error("Expected Lemma page.");
	expect(
		merged.connections.readings.map(({ readingId }) => readingId),
	).toEqual(["reading-1", "reading-2"]);

	const refreshed = lemmaPage("cursor-fresh", true, ["reading-3"]);
	const reset = resetRouteNotePagination(refreshed);
	expect(reset.cursor).toBe("cursor-fresh");
	expect(reset.isDone).toBe(true);
	expect(reset.isLoading).toBe(false);
	expect(
		reset.note.routeKind === "Lemma"
			? reset.note.connections.readings.map(({ readingId }) => readingId)
			: [],
	).toEqual(["reading-3"]);
});

test("a rejected old page cannot report an error after a reactive reset", async () => {
	let rejectOldPage: ((cause: Error) => void) | undefined;
	const oldPage = new Promise<never>((_resolve, reject) => {
		rejectOldPage = reject;
	});
	const requestedRevision = 0;
	let currentRevision = requestedRevision;
	let isLoading = true;
	const message = oldPage.catch((cause: unknown) =>
		routePageFailureMessage(cause, requestedRevision, currentRevision),
	);
	currentRevision += 1;
	isLoading = resetRouteNotePagination(
		lemmaPage("cursor-fresh", false, ["reading-3"]),
	).isLoading;
	rejectOldPage?.(new Error("stale failure"));
	expect(await message).toBeNull();
	expect(isLoading).toBe(false);
});

function lemmaPage(
	continueCursor: string,
	isDone: boolean,
	readingIds: readonly string[],
) {
	return {
		kind: "RouteNote",
		routeKind: "Lemma",
		target: { kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		lemmaKind: "NOUN",
		coreFeatures: [],
		connections: {
			surfaces: [],
			readings: readingIds.map((readingId) => ({
				readingId,
				emojiDescription: "🏦",
				target: { kind: "UnitReadingNote", readingId },
			})),
			sameWrittenForm: [],
			continueCursor,
			isDone,
		},
	} as Extract<RouteNote, { routeKind: "Lemma" }>;
}

function renderBody(note: RouteNote) {
	return renderToStaticMarkup(
		createElement(MemoryRouter, {}, createElement(RouteNoteBody, { note })),
	);
}
