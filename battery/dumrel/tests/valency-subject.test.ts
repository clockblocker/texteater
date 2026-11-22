import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { aufLemma, wartenReading } from "./fixtures.js";

// The subject position and Clause correlate prepositions (ADR 0034).

const nom = { kind: "Case", governedCase: "Nom" } as const;
const germanVerbReading = (canonicalForm: string, emojiDescription: string) =>
	({
		...wartenReading,
		lemma: { ...wartenReading.lemma, canonicalForm },
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
const wohnenReading = germanVerbReading("wohnen", "🏠");
const dassClause = { kind: "Clause", form: "Dass" } as const;

test("a Nom stands only first in a pattern, and a pattern without one has no subject", () => {
	const acc = { ...nom, governedCase: "Acc" } as const;
	// es heißt, dass …: no Nom, so no subject, and a lone clause first.
	const heissen = [[dassClause]];
	expect(
		parseReadingKnowledge({
			source: germanVerbReading("heißen", "📜"),
			knowledge: { valency: heissen },
		}),
	).toEqual({ success: true, value: { valency: heissen } });
	for (const valency of [[[acc, nom]], [[nom, acc, nom]]]) {
		const late = parseReadingKnowledge({
			source: wohnenReading,
			knowledge: { valency },
		});
		expect(late.success).toBe(false);
		if (!late.success)
			expect(late.error.issues[0]?.message).toBe(
				"A Nom Case complement stands only first in a Valency Pattern, as its subject",
			);
	}
});

test("a Clause complement may carry a da(r)- correlate preposition without needing a sibling Preposition", () => {
	const correlated = { ...dassClause, preposition: aufLemma } as const;
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [[nom, correlated]] },
		}),
	).toEqual({ success: true, value: { valency: [[nom, correlated]] } });
});
