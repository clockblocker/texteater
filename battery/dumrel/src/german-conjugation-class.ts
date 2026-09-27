import type { ConjugationClass } from "./types.js";

const words = (form: string) =>
	form
		.toLocaleLowerCase("de")
		.split(/\s+/u)
		.filter((word) => word !== "" && word !== "sich");

/** The infinitive without `-en` or `-n`: `wiegen` → `wieg`, `wandern` → `wander`. */
const stemOf = (infinitive: string) =>
	infinitive.endsWith("en")
		? infinitive.slice(0, -2)
		: infinitive.endsWith("n")
			? infinitive.slice(0, -1)
			: infinitive;

/**
 * The conjugation class this Präteritum form attests for a German verb (ADR
 * 0038), judged on the stem. Weak adds `-te` or `-ete` to the unchanged stem
 * (`wiegen`, `wiegte`; `arbeiten`, `arbeitete`), Mixed adds `-te` to a changed
 * stem (`bringen`, `brachte`), and Strong adds no `-te` (`wiegen`, `wog`).
 * Both forms are compared without case and without `sich`, and a separable
 * verb is judged by its stem, its particle split off or not: `aufstehen`,
 * `stand auf` is `stehen`, `stand`, Strong; `abholen`, `holte ab` is Weak.
 */
export function germanConjugationClass(
	infinitive: string,
	praeteritum: string,
): ConjugationClass {
	const [finite = "", ...particles] = words(praeteritum);
	let stem = stemOf(words(infinitive).join(""));
	const particle = particles.join("");
	if (particle && stem.startsWith(particle))
		stem = stem.slice(particle.length);
	if (!finite.endsWith("te")) return "Strong";
	const base = finite.slice(0, -2);
	// The stem may still carry a particle `holte` does not: `abhol`, `hol`.
	const keeps = (candidate: string) =>
		candidate !== "" && (stem === candidate || stem.endsWith(candidate));
	return keeps(base) || (base.endsWith("e") && keeps(base.slice(0, -1)))
		? "Weak"
		: "Mixed";
}
