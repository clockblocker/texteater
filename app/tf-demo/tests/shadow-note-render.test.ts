import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";

import type { api } from "../convex/_generated/api";
import { renderNote } from "../src/notes";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";
import {
	isCurrentShadowAction,
	reduceShadowControls,
	shadowCleanupFeedback,
} from "../src/views/shadow-note-view";

type ShadowNote = Extract<
	NonNullable<FunctionReturnType<typeof api.shadowNotes.get>>,
	{ readonly kind: "Shadow" }
>;

function noteFixture(): ShadowNote {
	return {
		kind: "Shadow",
		target: { kind: "Shadow", shadowId: "shadow-1" as never },
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
					target: { kind: "Lemma", lemmaId: "lemma-bank-a" as never },
				},
				{
					lemmaId: "lemma-bank-b" as never,
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: [{ name: "nounClass", value: "institution" }],
					target: { kind: "Lemma", lemmaId: "lemma-bank-b" as never },
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
							kind: "Reading",
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
		renderNote({
			noteData: note,
			capabilities: {
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
			},
		}),
	);
}

test("routes Shadow subjects through the universal pipeline", () => {
	const markup = render(noteFixture());
	expect(markup).not.toContain('role="alert"');
});

test("the paginated Note interface merges Shadow referrers by Reading", async () => {
	const first = noteFixture();
	first.references.continueCursor = "cursor-1";
	first.references.isDone = false;
	const next = noteFixture();
	next.references.page = [
		{
			...next.references.page[0],
			pendingRelations: [
				{ locatorKey: "locator-three", relation: "synonym" },
			],
			structuralReferences: [],
		},
	];
	const loader = createPaginatedNoteLoader(first, async () => next);

	await loader.loadMore();

	expect(loader.current().hasMore).toBe(false);
	expect(loader.current().note.references.page).toHaveLength(1);
	expect(
		loader
			.current()
			.note.references.page[0]?.pendingRelations.map(
				({ locatorKey }) => locatorKey,
			),
	).toEqual(["locator-one", "locator-two", "locator-three"]);
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
