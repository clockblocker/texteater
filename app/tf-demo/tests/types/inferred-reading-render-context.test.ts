import { describe, expect, it } from "bun:test";
import { inferredType } from "prinfer/testing";

import type { ReadingRenderContext } from "../../src/notes/universal/blocks/renderer";

export type GermanVerbRendererReading = ReadingRenderContext<
	"de",
	"Lexeme",
	"VERB"
>["noteData"]["reading"];

describe("Reading renderer inference", () => {
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
