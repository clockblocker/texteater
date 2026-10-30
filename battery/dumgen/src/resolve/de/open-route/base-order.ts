/**
 * A German verbal Surface's base-order form (system ADR 0056): the Lemma's
 * fixed words, inflected, in its Canonical Form's order, and the verbal
 * complex last in a subordinate clause's order, so word-order variants
 * share one Surface (`hatte damit zu tun` and `Damit hatte … zu tun` are
 * both `mit zu tun hatte`).
 */

import { foldCase } from "dumling";

/** One written word of the unit, glued pieces joined, as Luna spelled its members. */
export type SurfaceWord = {
	readonly text: string;
	/** Whether a member of the word is an auxiliary jev judged as such. */
	readonly auxiliary: boolean;
};

/** What the base-order form is built from. */
export type BaseOrderInput = {
	readonly canonicalForm: string;
	/** A VERB Lexeme's separable prefix, from its Core. */
	readonly separablePrefix: string | undefined;
	readonly locution: boolean;
	readonly inflection: Readonly<Record<string, unknown>> | null | undefined;
	/** The unit's words in sentence order, with no subject es and nothing outside the headword. */
	readonly words: readonly SurfaceWord[];
	/** Whether a subject es leads the form. */
	readonly expletive: boolean;
};

/** The finite words of haben, sein and werden a periphrasis is built with. */
const AUXILIARY =
	/^(?:hab(?:e|en|est|et|t)?|hast|hat|hatte(?:st|n|t)?|hätte(?:st|n|t)?|bin|bist|ist|sind|seid|sei(?:en|st|est|et)?|war(?:st|en|t)?|wär(?:e|st|est|en|t|et)?|werde(?:n|t|st)?|wirst|wird|wurde(?:st|n|t)?|würde(?:st|n|t)?|ward)$/u;

/** The verbs whose perfect takes an infinitive for its participle, which the finite word then precedes (`hat müssen`). */
const ERSATZINFINITIV = new Set([
	"dürfen",
	"können",
	"mögen",
	"müssen",
	"sollen",
	"wollen",
	"brauchen",
	"lassen",
]);

/** The articles and possessives a Variation may swap (ADR 0039). */
const DETERMINER =
	/^(?:d(?:er|ie|as|en|em|es)|k?ein(?:e|en|em|er|es)?|(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?)$/u;

const fold = (word: string) => foldCase(word, "de");

/**
 * The fixed word `cited` that `word` realizes, as the base-order form
 * spells it: `word` itself, or in a Variation a determiner for a
 * determiner or a noun in another number; a pronominal adverb gives the
 * preposition it holds (`damit` gives `mit`).
 */
function realized(word: string, cited: string): string | undefined {
	const spelled = fold(word);
	const fixed = fold(cited);
	if (spelled === fixed) return word;
	const linker = /^[aeiouäöü]/u.test(fixed) ? "r" : "";
	if (
		[`da${linker}`, `wo${linker}`, "hier"].some(
			(prefix) => spelled === `${prefix}${fixed}`,
		)
	)
		return cited;
	if (DETERMINER.test(spelled) && DETERMINER.test(fixed)) return word;
	return /^\p{Lu}/u.test(cited) &&
		fixed.length >= 4 &&
		(spelled.startsWith(fixed) || fixed.startsWith(spelled))
		? word
		: undefined;
}

/**
 * The words that realize the Canonical Form's fixed words, by membership,
 * not order, so a fronted fixed word finds its place (`Damit hatte es zu
 * tun`): each fixed word takes the first word left that realizes it. Each
 * word's index in `words` maps to its spelling and the fixed word's index.
 */
function alignFixed(
	words: readonly string[],
	fixed: readonly string[],
): Map<number, { readonly at: number; readonly text: string }> {
	const aligned = new Map<number, { at: number; text: string }>();
	for (const [at, cited] of fixed.entries())
		for (const [index, word] of words.entries()) {
			if (aligned.has(index)) continue;
			const text = realized(word, cited);
			if (text === undefined) continue;
			aligned.set(index, { at, text });
			break;
		}
	return aligned;
}

/**
 * The verbal complex in a subordinate clause's order: the finite word
 * last, or first before an Ersatzinfinitiv (`hat reparieren lassen`), and
 * a separable particle joined to a finite word that is no auxiliary
 * (`anfängt`).
 */
function verbalComplex(
	verbal: readonly SurfaceWord[],
	particle: string | undefined,
	verb: string,
	bag: Readonly<Record<string, unknown>>,
): string[] {
	const periphrastic =
		verbal.length > 1 &&
		["perfect", "future", "passive", "voice"].some(
			(name) => bag[name] !== null && bag[name] !== undefined,
		);
	let finiteAt = -1;
	if (bag.verbForm === "Fin") {
		finiteAt = verbal.length > 1 ? 0 : verbal.length - 1;
		// haben, sein or werden first, which a causative's lassen follows
		// (`hat reparieren lassen`), then the auxiliary jev judged
		// (`geliefert bekommt`).
		if (periphrastic) {
			const judged = verbal.findLastIndex(({ auxiliary }) => auxiliary);
			const spelled = verbal.findLastIndex(({ text }) =>
				AUXILIARY.test(fold(text)),
			);
			finiteAt = spelled >= 0 ? spelled : Math.max(judged, 0);
		}
	}
	const texts = verbal.map(({ text }) => text);
	if (finiteAt < 0)
		return particle === undefined ? texts : [particle, ...texts];
	const finite = texts[finiteAt] ?? "";
	const rest = texts.filter((_, index) => index !== finiteAt);
	if (particle !== undefined && rest.length === 0)
		return [fold(`${particle}${finite}`)];
	const others = particle === undefined ? rest : [particle, ...rest];
	const last = fold(others.at(-1) ?? "");
	const ersatz =
		bag.perfect === "Yes" &&
		((ERSATZINFINITIV.has(fold(verb)) && last === fold(verb)) ||
			(bag.voice === "Cau" && last === "lassen"));
	return ersatz ? [finite, ...others] : [...others, finite];
}

/**
 * The words with a split pronominal adverb the Canonical Form spells as one
 * word joined in the place of its first piece: `da … für` of `da kann
 * nichts für` is `dafür` of `nichts dafür können`.
 */
function joinedAdverbs(
	words: readonly SurfaceWord[],
	fixed: readonly string[],
): SurfaceWord[] {
	const joined = [...words];
	for (const cited of fixed) {
		const [, adverb, preposition] =
			/^(dar|da|wor|wo|hier)(\p{L}+)$/u.exec(fold(cited)) ?? [];
		if (adverb === undefined || preposition === undefined) continue;
		const first = joined.findIndex(
			({ text }) =>
				fold(text) === adverb ||
				fold(text) === adverb.replace(/r$/u, ""),
		);
		const second = joined.findIndex(
			({ text }, index) => index > first && fold(text) === preposition,
		);
		if (first < 0 || second < 0) continue;
		joined[first] = { text: fold(cited), auxiliary: false };
		joined.splice(second, 1);
	}
	return joined;
}

/**
 * The base-order form of a German verbal unit. An imperative keeps its own
 * order (`komm herein`), as does a Canonical Form whose last word is no
 * verb (`da liegt der Hase im Pfeffer`, `frieren wie ein Schneider`).
 */
export function baseOrderSurface(input: BaseOrderInput): string {
	const bag = input.inflection ?? {};
	const cited = input.canonicalForm.split(" ");
	const verb = cited.at(-1) ?? "";
	const lead = input.expletive ? ["es"] : [];
	if (bag.mood === "Imp" || !/n$/u.test(verb))
		return [...lead, ...input.words.map(({ text }) => text)].join(" ");
	const words = joinedAdverbs(input.words, cited.slice(0, -1));
	const texts = words.map(({ text }) => text);
	const aligned = alignFixed(texts, cited.slice(0, -1));
	const fixed = [...aligned.values()]
		.sort((left, right) => left.at - right.at)
		.map(({ text }) => text);
	let verbal = words.filter((_, index) => !aligned.has(index));
	const prefix =
		input.separablePrefix === undefined
			? undefined
			: fold(input.separablePrefix);
	const particleAt =
		verbal.length > 1
			? verbal.findIndex(({ text }) => {
					const word = fold(text);
					return prefix !== undefined
						? word === prefix
						: input.locution &&
								word.length < fold(verb).length &&
								fold(verb).startsWith(word);
				})
			: -1;
	let particle = verbal[particleAt]?.text;
	verbal = verbal.filter((_, index) => index !== particleAt);
	// A prefix the Canonical Form spells apart stays a word before the verb (`übrig blieb`).
	if (particle !== undefined && !fold(verb).startsWith(fold(particle))) {
		fixed.push(particle);
		particle = undefined;
	}
	return [
		...lead,
		...fixed,
		...verbalComplex(verbal, particle, verb, bag),
	].join(" ");
}
