import { expect, test } from "bun:test";
import { germanConjugationClass } from "dumrel";
import { loadSpecRecords } from "../src/index.js";

// Dumrel checks the two aspects apart; gold keeps them in agreement (ADR 0038).
test("gold's Präteritum forms attest exactly the conjugation classes it stores (#1209)", () => {
	const disagreements: string[] = [];
	let checked = 0;
	for (const record of loadSpecRecords())
		for (const target of record.targets) {
			const { preterite, conjugationClass } = target.knowledge ?? {};
			if (!preterite || !conjugationClass) continue;
			checked += 1;
			const lemma = target.attestation.surface.lemma.canonicalForm;
			const attested = new Set(
				preterite.map((form) => germanConjugationClass(lemma, form)),
			);
			if (
				attested.size !== conjugationClass.length ||
				!conjugationClass.every((value) => attested.has(value))
			)
				disagreements.push(
					`${lemma}: ${preterite.join(", ")} ≠ ${conjugationClass.join(", ")}`,
				);
		}
	expect(disagreements).toEqual([]);
	expect(checked).toBeGreaterThan(0);
});
