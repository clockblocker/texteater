import { expect, test } from "bun:test";
import { loadSpecRecords } from "../src/index.js";

/** Each gold verb with one conjugation class and its principal parts. */
function goldVerbs() {
	return loadSpecRecords().flatMap((record) =>
		record.targets.flatMap((target) => {
			const {
				conjugationClass,
				preterite,
				pastParticiple,
				subjunctivePast,
			} = target.knowledge ?? {};
			const [onlyClass, ...others] = conjugationClass ?? [];
			return onlyClass === undefined ||
				others.length > 0 ||
				!preterite ||
				!pastParticiple ||
				!subjunctivePast
				? []
				: [
						{
							lemma: target.attestation.surface.lemma
								.canonicalForm,
							onlyClass,
							preterite,
							pastParticiple,
							subjunctivePast,
						},
					];
		}),
	);
}

// The forms are the source of truth (ADR 0038); these hold for every verb
// of one class, so gold that breaks them is a slip.
test("gold's principal parts agree with its one conjugation class (#1217)", () => {
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
		// A Strong verb's Partizip II ends in -n, a Weak or Mixed one's in -t.
		const ending = verb.onlyClass === "Strong" ? /n$/u : /t$/u;
		if (!verb.pastParticiple.every((form) => ending.test(finite(form))))
			slips.push(`${verb.lemma}: Partizip II ${verb.pastParticiple}`);
	}
	expect(slips).toEqual([]);
	expect(verbs.length).toBeGreaterThan(20);
	expect(new Set(verbs.map((verb) => verb.onlyClass))).toEqual(
		new Set(["Strong", "Weak", "Mixed"]),
	);
});
