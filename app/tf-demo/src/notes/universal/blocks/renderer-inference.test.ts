import { afterAll, describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import type { FunctionReturnType } from "convex/server";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type { api } from "../../../../convex/_generated/api";
import type { ReadingRenderContext } from "./renderer";

afterAll(closeTestingSessions);

// tsconfig.app.json excludes test files, so name the project that holds this one.
const project = fileURLToPath(
	new URL("../../../../tsconfig.type-tests.json", import.meta.url),
);

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
				backend: "typescript7",
				project,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingNoteIdentity = { lemma: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasSepPrefix: string | null; lexicallyReflexive: "Acc" | "Dat" | null; }; ownerKind: "Lemma"; ownerKey: string; lemmaId: Id<"lemmas">; }; unitKind: "Reading"; emojiDescription: string; ownerKind: "Reading"; ownerKey: string; readingId: Id<"readings">; }"`,
		);
	}, 30_000);

	it("shows direct identity primitives in the editor-style hint", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbRendererReading",
				full: false,
				backend: "typescript7",
				project,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbRendererReading = { lemma: { language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasSepPrefix: string | null; lexicallyReflexive: "Acc" | "Dat" | null; }; ownerKind: "Lemma"; ownerKey: string; lemmaId: Id<...>; }; emojiDescription: string; ownerKind: "Reading"; ownerKey: string; readingId: Id<...>; }"`,
		);
	}, 30_000);

	it("exposes only the selected language, Family, and Kind branch", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbRendererReading",
				full: true,
				backend: "typescript7",
				project,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbRendererReading = { lemma: { language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasSepPrefix: string | null; lexicallyReflexive: "Acc" | "Dat" | null; }; ownerKind: "Lemma"; ownerKey: string; lemmaId: Id<"lemmas">; }; emojiDescription: string; ownerKind: "Reading"; ownerKey: string; readingId: Id<"readings">; }"`,
		);
	}, 30_000);
});
