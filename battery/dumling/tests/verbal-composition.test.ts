import { expect, test } from "bun:test";
import review from "../../dumgen/src/evaluation/redesign/review-cases.json";
import { checkIfGrundform, parseUnit } from "../src/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../src/schemas/concrete-language/de/de-feature-catalog.js";

const finite = {
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

for (const construction of review.constructions) {
	test(`${construction.id}: all complete scoped targets validate as Full`, () => {
		for (const target of construction.targets) {
			const features = {
				verbForm: target.form,
				tense: target.finiteTense,
				mood: target.form === "Fin" ? "Ind" : null,
				person: target.form === "Fin" ? "3" : null,
				number: target.form === "Fin" ? "Sing" : null,
				perfect: target.perfect ? "Yes" : null,
				future: target.future ? "Yes" : null,
				voice: target.passive ? "Pass" : null,
				passive: target.passive,
			};
			const result = parseUnit({
				unitKind: "Attestation",
				members: target.members.map((attested) => ({
					attested,
					orthography: "Standard",
				})),
				realizationCoverage: "Full",
				surface: {
					unitKind: "Surface",
					language: "de",
					normalizedSurface: target.members.join(" "),
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: features,
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: "Lexeme",
						kind: target.kind,
						canonicalForm: target.canonicalForm,
						coreFeatures:
							target.kind === "AUX"
								? { verbType: "Mod" }
								: {
										verbType: null,
										hasGovPrep: null,
										hasSepPrefix: null,
										lexicallyReflexive: null,
									},
					},
				},
			});
			expect(result.success).toBe(true);
			if (!result.success) throw result.error;
			if (result.chain.unitKind !== "Attestation")
				throw Error("Expected Attestation");
			expect(checkIfGrundform(result.chain.value.surface)).toEqual({
				success: true,
				value:
					target.form === "Inf" &&
					!target.perfect &&
					!target.future &&
					!target.passive,
			});
		}
	});
}
