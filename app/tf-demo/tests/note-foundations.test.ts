import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
	NOTE_BLOCK_RENDERER_REGISTRY,
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
		"Reading",
		"Lemma",
		"Surface",
		"Attestation",
		"Shadow",
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
	expect(Object.keys(NOTE_BLOCK_RENDERER_REGISTRY.de.Surface)).toEqual([
		"Header",
		"Routes",
	]);
	expect(
		Object.keys(NOTE_BLOCK_RENDERER_REGISTRY.de.Shadow.Lexeme.NOUN),
	).toEqual(["Header", "Relations"]);
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
		Reading: "Reading Note unavailable",
		Lemma: "Lemma Note unavailable",
		Surface: "Surface Note unavailable",
		Attestation: "Attestation Note unavailable",
		Shadow: "Shadow Note unavailable",
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
