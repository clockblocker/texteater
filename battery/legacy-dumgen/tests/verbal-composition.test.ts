import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import review from "../src/evaluation/redesign/review-cases.json";

// Every complete verbal construction the redesign reviewed must be a valid
// Dumling Attestation, and only a bare infinitive may be its Grundform.
for (const construction of review.constructions) {
	test(`${construction.id}: all complete scoped targets validate as Full`, () => {
		for (const target of construction.targets) {
			const features = {
				expletive: null,
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
				expletiveEvidence: null,
				valencyEvidence: [],
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
