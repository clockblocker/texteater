import { describe, expect, it } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { inferredType } from "prinfer/testing";

import type { api } from "../../convex/_generated/api";
import type { ReadingRenderContext } from "../../src/notes/universal/blocks/renderer";

type ReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;

export type GermanVerbReadingNoteIdentity = Extract<
	ReadingNote["reading"],
	{ lemma: { language: "de"; family: "Lexeme"; kind: "VERB" } }
>;

export type GermanVerbRendererReading = ReadingRenderContext<
	"de",
	"Lexeme",
	"VERB"
>["noteData"]["reading"];

describe("Reading renderer inference", () => {
	it("preserves the selected branch through the Reading Note API", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbReadingNoteIdentity",
				full: true,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingNoteIdentity = { lemma: { language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; ownerKind: "Lemma"; ownerKey: string; }; emojiDescription: string; ownerKind: "Reading"; ownerKey: string; readingId: Id<"readings">; }"`,
		);
	}, 30_000);

	it("shows direct identity primitives in the editor-style hint", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbRendererReading",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbRendererReading = { lemma: { language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; ownerKind: "Lemma"; ownerKey: string; }; emojiDescription: string; ownerKind: "Reading"; ownerKey: str..."`,
		);
	}, 30_000);

	it("exposes only the selected language, Family, and Kind branch", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbRendererReading",
				full: true,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbRendererReading = { lemma: { language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; ownerKind: "Lemma"; ownerKey: string; }; emojiDescription: string; ownerKind: "Reading"; ownerKey: string; readingId: Id<"readings">; }"`,
		);
	}, 30_000);
});
