import { describe, expect, it } from "bun:test";
import { inferredType } from "prinfer/testing";

import type { Reading } from "../../src/types";

export type GermanVerbReadingBranch = Extract<
	Reading<"de">,
	{ lemma: { language: "de"; family: "Lexeme"; kind: "VERB" } }
>;

describe("Dumling Reading inference", () => {
	it("preserves each language, Family, and Kind branch", () => {
		expect(
			inferredType(import.meta.url, { name: "GermanVerbReadingBranch" }),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingBranch = { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }"`,
		);
	}, 30_000);
});
