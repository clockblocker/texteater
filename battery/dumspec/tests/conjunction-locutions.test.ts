import { expect, test } from "bun:test";
import { germanConjunctionLocutions, loadSpecRecords } from "../src/index.js";

const listed = new Set<string>(
	Object.values(germanConjunctionLocutions).flat(),
);

test("every dass or zu-infinitive Locution SCONJ in the gold is listed", () => {
	const unlisted = new Set<string>();
	for (const record of loadSpecRecords())
		for (const target of record.targets) {
			const lemma = target.attestation?.surface.lemma;
			if (
				lemma?.language === "de" &&
				lemma.family === "Locution" &&
				lemma.kind === "SCONJ" &&
				/^\S+ (?:dass|… zu)$/u.test(lemma.canonicalForm) &&
				!listed.has(lemma.canonicalForm)
			)
				unlisted.add(lemma.canonicalForm);
		}
	expect([...unlisted]).toEqual([]);
});
