import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { aufLemma, wartenReading } from "./fixtures.js";

// The subject Slot and a correlate's word (ADR 0034).

const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	governedCase: "Acc",
} as const;
const optional = <const C extends unknown[]>(...complements: C) =>
	({ status: "Optional", complements }) as const;
const required = <const C extends unknown[]>(...complements: C) =>
	({ status: "Required", complements }) as const;
const nom = { kind: "Case", governedCase: "Nom" } as const;
const germanVerbReading = (canonicalForm: string, emojiDescription: string) =>
	({
		...wartenReading,
		lemma: { ...wartenReading.lemma, canonicalForm },
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
const wohnenReading = germanVerbReading("wohnen", "🏠");
const dassClause = { kind: "Clause", form: "Dass" } as const;
const obClause = { kind: "Clause", form: "Ob" } as const;

test("a Nom stands only in the first Slot, the subject's, and a frame without one has no subject", () => {
	const acc = { ...nom, governedCase: "Acc" } as const;
	// es heißt, dass …: no Nom, so no subject, and a lone clause first.
	const heissen = [required(dassClause)];
	expect(
		parseReadingKnowledge({
			source: germanVerbReading("heißen", "📜"),
			knowledge: { valency: heissen },
		}),
	).toEqual({ success: true, value: { valency: heissen } });
	for (const valency of [
		[required(acc), required(nom)],
		[required(nom), optional(acc, nom)],
	]) {
		const late = parseReadingKnowledge({
			source: wohnenReading,
			knowledge: { valency },
		});
		expect(late.success).toBe(false);
		if (!late.success)
			expect(late.error.issues[0]?.message).toBe(
				"A Nom Case complement stands only in a frame's first Slot, the subject's",
			);
	}
});

test("a Clause with a correlate shares its Slot with the Case or Preposition its word derives from", () => {
	const acc = { ...nom, governedCase: "Acc" } as const;
	const dat = { ...nom, governedCase: "Dat" } as const;
	const needsCorrelate = { ...dassClause, correlate: "Required" } as const;
	const mayTakeCorrelate = { ...dassClause, correlate: "Optional" } as const;
	// es (Acc), dem (Dat), darauf (auf): each Slot gives the correlate a word.
	for (const valency of [
		[required(nom), optional(acc, mayTakeCorrelate)],
		[required(nom), required(dat, needsCorrelate)],
		[required(nom), required(aufAcc, needsCorrelate)],
	])
		expect(
			parseReadingKnowledge({
				source: wartenReading,
				knowledge: { valency },
			}),
		).toEqual({ success: true, value: { valency } });
	for (const correlated of [needsCorrelate, mayTakeCorrelate]) {
		const alone = parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [required(nom), required(correlated, obClause)],
			},
		});
		expect(alone.success).toBe(false);
		if (!alone.success)
			expect(alone.error.issues[0]?.path).toEqual([
				"knowledge",
				"valency",
				1,
				"complements",
				0,
				"correlate",
			]);
	}
});
