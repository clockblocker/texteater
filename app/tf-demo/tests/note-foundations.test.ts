import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
	NOTE_BLOCK_KIND_FOR,
	type NoteBlockKind,
	type NoteData,
	noteBlockKindSchema,
	noteKindSchema,
	orderNoteBlockKinds,
	renderNote,
	targetLanguageSchema,
	WEIGHT_FOR_NOTE_BLOCK_KIND,
} from "../src/notes";

test("shared Note and Block schemas expose the frozen vocabulary", () => {
	expect(noteKindSchema.options).toEqual([
		"UnitReadingNote",
		"RouteNote",
		"ShadowNote",
	]);
	expect(noteBlockKindSchema.options).toEqual([
		"Header",
		"SourceContexts",
		"Definition",
		"Translations",
		"Relations",
		"MorphologicalTree",
		"LexicalBreakdown",
		"Routes",
	]);
	expect(targetLanguageSchema.options).toEqual(["de"]);
	expect(NOTE_BLOCK_KIND_FOR.UnitReadingNote.options).not.toContain("Routes");
	expect(NOTE_BLOCK_KIND_FOR.RouteNote.options).toEqual(["Header", "Routes"]);
	expect(NOTE_BLOCK_KIND_FOR.ShadowNote.options).toEqual([
		"Header",
		"Relations",
	]);
});

test("Block ordering is independent from applicability and rejects ties", () => {
	expect(
		orderNoteBlockKinds(
			new Set<NoteBlockKind>([
				"Routes",
				"Definition",
				"Header",
				"Relations",
			]),
		),
	).toEqual(["Header", "Relations", "Definition", "Routes"]);

	expect(() =>
		orderNoteBlockKinds(new Set(["Header"]), {
			...WEIGHT_FOR_NOTE_BLOCK_KIND,
			Routes: WEIGHT_FOR_NOTE_BLOCK_KIND.LexicalBreakdown,
		}),
	).toThrow("Note Block weights must be unique");
});

test("the root dispatch covers stable kinds and visibly rejects unknown kinds", () => {
	const unavailableTitleFor = {
		UnitReadingNote: "Reading Note unavailable",
		RouteNote: "Route Note unavailable",
		ShadowNote: "Shadow Note unavailable",
	} as const;
	for (const kind of noteKindSchema.options) {
		const markup = renderToStaticMarkup(
			renderNote({ kind } as unknown as NoteData),
		);
		expect(markup).toContain('role="alert"');
		expect(markup).toContain(unavailableTitleFor[kind]);
	}

	const unknownMarkup = renderToStaticMarkup(
		renderNote({ kind: "Resolution" } as unknown as NoteData),
	);
	expect(unknownMarkup).toContain("Unknown Note");
	expect(unknownMarkup).toContain("Unknown Note kind: Resolution.");
});
