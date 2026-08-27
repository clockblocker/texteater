import { expect, test } from "bun:test";
import { presentedFeatureNames } from "dumling/vocabulary";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNote } from "../src/notes";
import type { RouteNoteData } from "../src/notes/route";
import {
	mergeRouteNotePages,
	resetRouteNotePagination,
	routePageFailureMessage,
} from "../src/views/route-note-view";

type RouteNote = RouteNoteData;

test("renders the complete Attestation route with typed workspace targets", () => {
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
		presented: {
			members: [
				{ attested: "steht", orthography: "Standard" },
				{ attested: "auf", orthography: "Standard" },
			],
			realizationCoverage: "Full",
			surface: presentedSurface("steht auf", "aufstehen", "VERB"),
		},
		surfaceTarget: {
			kind: "RouteNote",
			routeKind: "Surface",
			id: "surface-1",
		},
		reading: {
			emojiDescription: "🧍",
			target: { kind: "UnitReadingNote", readingId: "reading-1" },
		},
	} as RouteNote;
	const markup = renderBody(note);
	expect(markup).toContain("Er steht auf.");
	expect(markup.match(/<button type="button"/g)).toHaveLength(3);
	expect(markup).not.toContain("href=");
});

test("renders Surface and Lemma workspace commands, including polysemy and same-form travel", () => {
	const surface = {
		kind: "RouteNote",
		routeKind: "Surface",
		target: { kind: "RouteNote", routeKind: "Surface", id: "surface-1" },
		presented: presentedSurface("Bank", "Bank", "NOUN", {
			gender: "Fem",
		}),
		lemmaTarget: {
			kind: "RouteNote",
			routeKind: "Lemma",
			id: "lemma-1",
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
		presented: presentedLemma("Bank", "NOUN", { gender: "Fem" }),
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
	expect(surfaceMarkup.match(/<button type="button"/g)).toHaveLength(3);
	expect(lemmaMarkup.match(/<button type="button"/g)).toHaveLength(4);
	expect(lemmaMarkup).toContain("gender: Fem");
	expect(surfaceMarkup).not.toContain("abbr:");
	expect(lemmaMarkup).not.toContain("abbr:");
	expect(surfaceMarkup).not.toContain("href=");
	expect(lemmaMarkup).not.toContain("href=");
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

test("the root renderer consumes injected route pagination state", () => {
	const note = lemmaPage("cursor-next", false, ["reading-1"]);
	const markup = renderToStaticMarkup(
		renderNote(note, {
			pagination: {
				hasMore: true,
				isLoading: false,
				error: "Continuation failed.",
				async loadMore() {},
			},
			follow: () => {},
		}),
	);
	expect(markup).toContain("Load more route connections");
	expect(markup).toContain('role="alert"');
	expect(markup).toContain("Continuation failed.");
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
		presented: presentedLemma("Bank", "NOUN", { gender: "Fem" }),
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
	return renderToStaticMarkup(renderNote(note));
}

function presentedFeatures(
	overrides: Readonly<Record<string, string | readonly string[] | null>> = {},
) {
	return Object.fromEntries(
		presentedFeatureNames.map((name) => [name, overrides[name] ?? null]),
	);
}

function presentedLemma(
	canonicalForm: string,
	kind: string,
	coreFeatures: Readonly<
		Record<string, string | readonly string[] | null>
	> = {},
) {
	return {
		language: "de",
		canonicalForm,
		family: "Lexeme",
		kind,
		coreFeatures: presentedFeatures(coreFeatures),
	};
}

function presentedSurface(
	normalizedSurface: string,
	canonicalForm: string,
	kind: string,
	coreFeatures: Readonly<
		Record<string, string | readonly string[] | null>
	> = {},
) {
	return {
		language: "de",
		normalizedSurface,
		spelling: "Canonical",
		surfaceKind: "Citation",
		surfaceFeatures: { historicalStatus: null },
		lemma: presentedLemma(canonicalForm, kind, coreFeatures),
		inflectionalFeatures: presentedFeatures(),
	};
}
