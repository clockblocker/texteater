import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
	isCurrentShadowAction,
	reduceShadowControls,
	type ShadowNote,
	ShadowReferenceList,
	shadowCleanupFeedback,
} from "../src/views/shadow-note-view";

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
					readingId: "reading-source" as never,
					canonicalForm: "Bank",
					emojiDescription: "🪑",
					coreFeatures: [{ name: "nounClass", value: "place" }],
					target: {
						kind: "UnitReadingNote",
						readingId: "reading-source" as never,
					},
				},
				{
					readingId: "reading-bank" as never,
					canonicalForm: "Bank",
					emojiDescription: "🏦",
					coreFeatures: [{ name: "nounClass", value: "institution" }],
					target: {
						kind: "UnitReadingNote",
						readingId: "reading-bank" as never,
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
		createElement(
			MemoryRouter,
			{},
			createElement(ShadowReferenceList, {
				note,
				referrers: note.references.page,
				activeLocator: null,
				onResolve() {},
				onDiscard() {},
			}),
		),
	);
}

test("renders independent controls for exact equal-looking locators and filters a self candidate", () => {
	const markup = render(noteFixture());
	expect(markup).toContain("locator-one");
	expect(markup).toContain("locator-two");
	expect(markup.match(/Discard reference/g)).toHaveLength(2);
	expect(markup.match(/Resolve to 🏦 Bank/g)).toHaveLength(2);
	expect(markup).not.toContain("Resolve to 🪑 Bank");
	expect(markup).toContain('href="/note/reading/reading-bank"');
	expect(markup).toContain("nounClass: institution");
});

test("renders zero-candidate and structural-resolution gates without inventing a structural action", () => {
	const note = noteFixture();
	const selfCandidate = note.inspection.candidates[0];
	if (!selfCandidate) throw new Error("Expected self candidate fixture.");
	note.inspection.candidates = [selfCandidate];
	const markup = render(note);
	expect(markup).toContain("No exact Unit Reading candidate is available.");
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
