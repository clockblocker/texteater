import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";

import type { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { renderNote } from "../src/notes";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";
import {
	reduceShadowControls,
	shadowCleanupFeedback,
} from "../src/views/shadow-note-controls";

type ShadowNote = Extract<
	NonNullable<FunctionReturnType<typeof api.shadowNotes.get>>,
	{ readonly kind: "Shadow" }
>;

function noteFixture(): ShadowNote {
	return {
		kind: "Shadow",
		target: { kind: "Shadow", shadowId: "shadow-1" as Id<"shadows"> },
		descriptor: {
			language: "de",
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		},
		inspection: {
			candidates: [
				{
					lemmaId: "lemma-bank-a" as Id<"lemmas">,
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: [{ name: "nounClass", value: "place" }],
					target: {
						kind: "Lemma",
						lemmaId: "lemma-bank-a" as Id<"lemmas">,
					},
				},
				{
					lemmaId: "lemma-bank-b" as Id<"lemmas">,
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: [{ name: "nounClass", value: "institution" }],
					target: {
						kind: "Lemma",
						lemmaId: "lemma-bank-b" as Id<"lemmas">,
					},
				},
			],
		},
		references: {
			page: [
				{
					reading: {
						readingId: "reading-source" as Id<"readings">,
						canonicalForm: "laufen",
						emojiDescription: "🏃",
						target: {
							kind: "Reading",
							readingId: "reading-source" as Id<"readings">,
						},
					},
					pendingRelations: [
						{ locatorKey: "locator-one", relation: "synonym" },
						{ locatorKey: "locator-two", relation: "synonym" },
					],
					structuralReferences: [
						{
							aspect: "morphologicalTree",
							path: "root.children[0]",
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
	const loader = createPaginatedNoteLoader(
		first,
		async () => next.references,
	);

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

test("keeps conflict feedback after a cleanup settles", () => {
	const conflict = {
		status: "conflict",
		message: "Inspection is stale.",
	} as const;
	expect(shadowCleanupFeedback(conflict)).toEqual({
		actionError: "Inspection is stale. The Shadow Note was refreshed.",
		outcome: null,
	});
	const settled = reduceShadowControls(
		{ actionError: null, outcome: null },
		{ type: "settled", result: conflict },
	);
	expect(settled.actionError).toBe(
		"Inspection is stale. The Shadow Note was refreshed.",
	);
});
