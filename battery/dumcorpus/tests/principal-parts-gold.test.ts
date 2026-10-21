import { expect, test } from "bun:test";
import { germanConjugationClass } from "dumrel";
import { loadSpecRecords } from "../src/index.js";

/**
 * Each gold verb Reading whose licensed Präteritum forms derive one
 * conjugation class, with its licensed principal parts.
 */
function goldVerbs() {
	return loadSpecRecords().flatMap((record) =>
		record.targets.flatMap((target) => {
			const { preterite, pastParticiple, subjunctivePast } =
				target.paradigm ?? {};
			const lemma = target.attestation.surface.lemma.canonicalForm;
			const classes = new Set(
				(preterite ?? []).map((form) =>
					germanConjugationClass(lemma, form),
				),
			);
			const [onlyClass, ...others] = classes;
			return onlyClass === undefined ||
				others.length > 0 ||
				!preterite ||
				!pastParticiple ||
				!subjunctivePast
				? []
				: [
						{
							lemma,
							onlyClass,
							preterite,
							pastParticiple,
							subjunctivePast,
						},
					];
		}),
	);
}

// The forms are the source of truth, and gold keeps each licensed selection
// consistent (ADR 0038); these hold for every verb of one class, so gold
// that breaks them is a slip.
test("gold's licensed principal parts agree with the one conjugation class its Präteritum derives (#1217)", () => {
	const slips: string[] = [];
	const verbs = goldVerbs();
	for (const verb of verbs) {
		const finite = (form: string) => form.split(" ")[0] ?? "";
		const sameAsPreterite =
			verb.subjunctivePast.join() === verb.preterite.join();
		// A Weak verb's Konjunktiv II is its Präteritum; a Strong or Mixed
		// verb's never is (`wäre`, `müsste`, `verbrennte`).
		if (sameAsPreterite !== (verb.onlyClass === "Weak"))
			slips.push(`${verb.lemma}: Konjunktiv II ${verb.subjunctivePast}`);
		// A Strong verb's Partizip II ends in -n and a Mixed one's in -t; a
		// Weak Präteritum may have a strong participle (`backte`, `gebacken`).
		const ending =
			verb.onlyClass === "Strong"
				? /n$/u
				: verb.onlyClass === "Mixed"
					? /t$/u
					: undefined;
		if (
			ending &&
			!verb.pastParticiple.every((form) => ending.test(finite(form)))
		)
			slips.push(`${verb.lemma}: Partizip II ${verb.pastParticiple}`);
	}
	expect(slips).toEqual([]);
	expect(verbs.length).toBeGreaterThan(20);
	expect(new Set(verbs.map((verb) => verb.onlyClass))).toEqual(
		new Set(["Strong", "Weak", "Mixed"]),
	);
});
