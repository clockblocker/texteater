import { afterAll, describe, expect, it } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type { Reading } from "../../src/types";

afterAll(closeTestingSessions);

export type GermanVerbReadingBranch = Extract<
	Reading<"de">,
	{ lemma: { language: "de"; family: "Lexeme"; kind: "VERB" } }
>;

describe("Dumling Reading inference", () => {
	it("preserves each language, Family, and Kind branch", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbReadingBranch",
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingBranch = { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }"`,
		);
	}, 30_000);
});
