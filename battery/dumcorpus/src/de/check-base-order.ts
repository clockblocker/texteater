import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";

/** A base-order form that fails to spell its Canonical Form, at a path inside the checked Attestation. */
type BaseOrderIssue = {
	readonly path: string;
	readonly message: string;
};

type Bag = Readonly<Record<string, unknown>>;

/** The finite words of haben, sein and werden a periphrasis ends with. */
const AUXILIARY =
	/^(?:hab(?:e|en|est|et|t)?|hast|hat|hatte(?:st|n|t)?|hätte(?:st|n|t)?|bin|bist|ist|sind|seid|sei(?:en|st|est|et)?|war(?:st|en|t)?|wär(?:e|st|est|en|t|et)?|werde(?:n|t|st)?|wirst|wird|wurde(?:st|n|t)?|würde(?:st|n|t)?|ward)$/u;

/** The finite words of the other verbs a periphrasis ends with: a recipient passive's or a causative's. */
const OTHER_AUXILIARY =
	/^(?:bekomm(?:e|st|t|en)|bekam(?:st|en|t)?|bekäm(?:e|st|en|t)|krieg(?:e|st|t|en|te|test|ten|tet)|erhalt(?:e|en|et)|erhältst|erhält|erhielt(?:st|en|et)?|lass(?:e|en|t)?|lässt|ließ(?:est|en|t)?)$/u;

/** The infinitives a perfect takes for its participle: a modal's, and `lassen`'s, `sehen`'s, `hören`'s and `helfen`'s. */
const ERSATZINFINITIV =
	/^(?:dürfen|können|mögen|müssen|sollen|wollen|brauchen|lassen|sehen|hören|helfen)$/u;

/**
 * The words a Variation may change in a Locution (ADR 0039): articles and
 * possessives swap among themselves, and may be missing.
 */
const DETERMINER =
	/^(?:d(?:er|ie|as|en|em|es)|k?ein(?:e|en|em|er|es)?|(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?)$/u;

const fold = (word: string) => foldCase(word, "de");

/**
 * Whether a stored word realizes a Canonical Form's fixed word: the same
 * word, or a Variation of it (ADR 0039), a determiner for a determiner or a
 * noun in another number (`Entscheidungen` for `Entscheidung`).
 */
function realizes(stored: string, cited: string): boolean {
	const word = fold(stored);
	const fixed = fold(cited);
	if (word === fixed) return true;
	if (DETERMINER.test(word) && DETERMINER.test(fixed)) return true;
	return (
		/^\p{Lu}/u.test(cited) &&
		fixed.length >= 4 &&
		(word.startsWith(fixed) || fixed.startsWith(word))
	);
}

/** Whether `stored` realizes `cited` word by word, a cited determiner missing at most. */
function spellsFixedWords(
	stored: readonly string[],
	cited: readonly string[],
): boolean {
	let at = 0;
	for (const word of cited) {
		const next = stored[at];
		if (next !== undefined && realizes(next, word)) at++;
		else if (!DETERMINER.test(fold(word))) return false;
	}
	return at === stored.length;
}

/**
 * Why a verbal complex is not in subordinate-clause order: one word when no
 * periphrasis builds it (`anfängt`, not `fängt an`), its finite word last
 * (`gesprochen hat`), or first before an Ersatzinfinitiv (`hat reparieren
 * lassen`, `hat müssen`).
 */
function complexIssue(complex: readonly string[], bag: Bag): string | null {
	const periphrastic = ["perfect", "future", "passive", "voice"].some(
		(name) => bag[name] !== null && bag[name] !== undefined,
	);
	if (!periphrastic)
		return complex.length === 1
			? null
			: `its verbal complex ${complex.join(" ")} is not one word`;
	if (bag.verbForm !== "Fin" || complex.length === 1) return null;
	const finite = (word: string | undefined) =>
		word !== undefined &&
		(AUXILIARY.test(fold(word)) || OTHER_AUXILIARY.test(fold(word)));
	if (finite(complex.at(-1))) return null;
	if (
		bag.perfect === "Yes" &&
		finite(complex[0]) &&
		ERSATZINFINITIV.test(fold(complex.at(-1) ?? ""))
	)
		return null;
	return `its verbal complex ${complex.join(" ")} does not end with its finite word`;
}

/**
 * Where a German verbal Surface's base-order form (system ADR 0056) fails
 * to spell its Lemma's Canonical Form: with the verbal complex inflected
 * back to the infinitive, it reads as the Canonical Form, so the fixed
 * words stand in the Canonical Form's order and the verbal complex where
 * its verb stands, last unless the Canonical Form fixes another order
 * (`fror wie ein Schneider`). A subject expletive `es` leads (`es regnet`).
 * Only a Full realization is checked, and an imperative keeps its own order
 * (`komm herein`), so neither is read. A Variation (ADR 0039) may change or
 * drop a determiner or a noun's number. Which forms inflect back to the
 * verb is the pack's business; this check reads only the order.
 */
export function attestationBaseOrderIssues(
	attestation: Dumling.Attestation<"de">,
): BaseOrderIssue[] {
	const { surface } = attestation;
	if (surface.lemma.kind !== "VERB") return [];
	if (attestation.realizationCoverage !== "Full") return [];
	const bag: Bag =
		("inflectionalFeatures" in surface
			? (surface.inflectionalFeatures as Bag | null)
			: null) ?? {};
	if (bag.mood === "Imp") return [];
	const cited = surface.lemma.canonicalForm.split(" ");
	let stored = surface.normalizedSurface.split(" ");
	if (bag.expletive) {
		if (stored[0] !== "es")
			return [
				{
					path: "surface.normalizedSurface",
					message: `${surface.normalizedSurface} does not open with its subject expletive es`,
				},
			];
		stored = stored.slice(1);
	}
	const issues: string[] = [];
	for (const [verbAt, verb] of cited.entries()) {
		const before = cited.slice(0, verbAt);
		const after = cited.slice(verbAt + 1);
		for (let start = 0; start <= stored.length; start++)
			for (let end = start + 1; end <= stored.length; end++) {
				const complex = stored.slice(start, end);
				if (
					!spellsFixedWords(stored.slice(0, start), before) ||
					!spellsFixedWords(stored.slice(end), after)
				)
					continue;
				// The Canonical Form's own finite word stays as cited (`da liegt der Hase im Pfeffer`).
				if (
					complex.length === 1 &&
					fold(complex[0] ?? "") === fold(verb)
				)
					return [];
				const issue = complexIssue(complex, bag);
				if (issue === null) return [];
				issues.push(issue);
			}
	}
	return [
		{
			path: "surface.normalizedSurface",
			message: `${surface.normalizedSurface} is not the base-order form of ${surface.lemma.canonicalForm}${issues[0] ? `: ${issues[0]}` : ": its fixed words and verbal complex do not stand in the Canonical Form's order"}`,
		},
	];
}
