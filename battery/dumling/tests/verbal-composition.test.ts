import { expect, test } from "bun:test";
import { DeVerbalInflectionalFeatureBagSchema } from "../src/schemas/concrete-language/de/de-feature-catalog.js";

const finite = {
	expletive: null,
	verbForm: "Fin",
	tense: "Pres",
	mood: "Ind",
	person: "3",
	number: "Sing",
	perfect: "Yes",
	future: null,
	voice: "Pass",
	passive: "Process",
};
const infinitive = {
	...finite,
	verbForm: "Inf",
	tense: null,
	mood: null,
	person: null,
	number: null,
};

test("whole perfect passive is representable without conflating finite tense or participle morphology", () => {
	expect(DeVerbalInflectionalFeatureBagSchema.safeParse(finite).success).toBe(
		true,
	);
	expect(
		DeVerbalInflectionalFeatureBagSchema.safeParse(infinitive).success,
	).toBe(true);
	for (const invalid of [
		{ ...infinitive, tense: "Pres" },
		{ ...infinitive, person: "3" },
		{ ...infinitive, number: "Sing" },
		{ ...finite, passive: null },
		{ ...finite, voice: null },
		{ ...finite, aspect: "Perf" },
	])
		expect(
			DeVerbalInflectionalFeatureBagSchema.safeParse(invalid).success,
		).toBe(false);
});
