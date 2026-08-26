import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNote } from "../src/notes";
import type { ShadowNoteData } from "../src/notes/shadow";
import {
	isCurrentShadowAction,
	reduceShadowControls,
	shadowCleanupFeedback,
} from "../src/views/shadow-note-view";

type ShadowNote = ShadowNoteData;

function noteFixture(): ShadowNote {
	return {
		kind: "ShadowNote",
		target: { kind: "ShadowNote", shadowId: "shadow-1" as never },
		descriptor: {
			language: "de",
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		},
		inspection: {
			revision: "convex-4",
			candidates: [
				{
					lemmaId: "lemma-bank-a" as never,
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: [{ name: "nounClass", value: "place" }],
					target: {
						kind: "RouteNote",
						routeKind: "Lemma",
						id: "lemma-bank-a" as never,
					},
				},
				{
					lemmaId: "lemma-bank-b" as never,
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: [{ name: "nounClass", value: "institution" }],
					target: {
						kind: "RouteNote",
						routeKind: "Lemma",
						id: "lemma-bank-b" as never,
					},
				},
			],
		},
		references: {
			page: [
				{
					reading: {
						readingId: "reading-source" as never,
						canonicalForm: "laufen",
						emojiDescription: "🏃",
						target: {
							kind: "UnitReadingNote",
							readingId: "reading-source" as never,
						},
					},
					pendingRelations: [
						{ locatorKey: "locator-one", relation: "synonym" },
						{ locatorKey: "locator-two", relation: "synonym" },
					],
					structuralReferences: [
						{
							aspect: "lexicalBreakdown",
							path: "lexicalBreakdown[0]",
						},
					],
				},
			],
			continueCursor: "",
			isDone: true,
		},
	};
}

function render(note: ShadowNote) {
	return renderToStaticMarkup(
		renderNote(note, {
			references: {
				items: note.references.page,
				hasMore: false,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			cleanup: {
				activeLocator: null,
				actionError: null,
				outcome: null,
				async resolve() {},
			},
			follow: () => {},
		}),
	);
}

test("renders one deterministic resolve control per exact equal-looking locator", () => {
	const markup = render(noteFixture());
	expect(markup).toContain("locator-one");
	expect(markup).toContain("locator-two");
	expect(markup).not.toContain("Discard reference");
	expect(markup.match(/Resolve exact Lemma match/g)).toHaveLength(2);
	expect(markup).not.toContain("href=");
	expect(markup.match(/<button type="button"/g)).toHaveLength(7);
	expect(markup).toContain("nounClass: institution");
});

test("renders zero-candidate and structural-resolution gates without inventing a structural action", () => {
	const note = noteFixture();
	note.inspection.candidates = [];
	const markup = render(note);
	expect(markup).toContain("No exact Lemma candidate is available.");
	expect(markup).toContain("Structural Shadow resolution is unavailable");
	expect(markup).toContain(
		"Dumrel defines the resolved lexical replacement DTO.",
	);
	expect(markup).not.toContain("Resolve to");
});

test("keeps conflict feedback after refresh and ignores a completion from an older target epoch", () => {
	const conflict = {
		status: "conflict",
		code: "revisionConflict",
		baseRevision: "convex-1",
		latestRevision: "convex-2",
		message: "Inspection is stale.",
	} as const;
	expect(shadowCleanupFeedback(conflict)).toEqual({
		actionError: "Inspection is stale. The Shadow Note was refreshed.",
		outcome: null,
	});
	const settled = reduceShadowControls(
		{ targetShadowId: "shadow-a", actionError: null, outcome: null },
		{ type: "settled", result: conflict },
	);
	const refreshed = reduceShadowControls(settled, {
		type: "refreshed",
		targetShadowId: "shadow-a",
	});
	expect(refreshed.actionError).toBe(
		"Inspection is stale. The Shadow Note was refreshed.",
	);
	expect(
		reduceShadowControls(refreshed, {
			type: "targetChanged",
			targetShadowId: "shadow-b",
		}),
	).toEqual({
		targetShadowId: "shadow-b",
		actionError: null,
		outcome: null,
	});
	expect(isCurrentShadowAction(3, 3)).toBe(true);
	expect(isCurrentShadowAction(3, 4)).toBe(false);
});
