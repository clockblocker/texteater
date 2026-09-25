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

test("only a participle Surface carries adjectival agreement", () => {
	const participle = {
		...infinitive,
		verbForm: "Part",
		participleForm: "Past",
		perfect: null,
		voice: null,
		passive: null,
		case: "Nom",
		number: "Plur",
		gender: null,
		degree: null,
	};
	expect(
		DeVerbalInflectionalFeatureBagSchema.safeParse(participle).success,
	).toBe(true);
	expect(
		DeVerbalInflectionalFeatureBagSchema.safeParse({
			...participle,
			participleForm: "Present",
			case: null,
			number: null,
		}).success,
	).toBe(true);
	for (const invalid of [
		{ ...participle, person: "3" },
		{ ...participle, case: "Voc" },
		{ ...finite, case: "Nom" },
		{ ...infinitive, gender: "Fem" },
	])
		expect(
			DeVerbalInflectionalFeatureBagSchema.safeParse(invalid).success,
		).toBe(false);
});
