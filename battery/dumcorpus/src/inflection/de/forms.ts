import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";

import { CASES, type Case, definiteArticle } from "./articles.js";
import { gendersOf } from "./noun-declension.js";

/**
 * A German form that is one word, or a fixed group spelled as one (`am
 * schnellsten`): a noun's, an adjective's or a closed determiner's. A noun's
 * table shows its definite article beside it as Context (`der Tag`); the
 * article is no part of the form.
 */
export type GermanWordForm = {
	readonly kind: "Word";
	readonly word: string;
	/** The definite article a noun cell shows: `der`, `der/das` for a mixed gender. */
	readonly article?: string;
};

/**
 * A German verb form with its parts kept apart (system ADR 0049): the table
 * algebra never models a periphrasis or a split-off particle, and display
 * joins them.
 *
 * - `er fährt … ab` is `{ pronoun: "er", finite: "fährt", particle: "ab" }`.
 * - `hat gefahren` is `{ finite: "hat", nonFinite: "gefahren" }`.
 * - The Partizip II `abgefahren` is `{ nonFinite: "abgefahren" }`.
 */
export type GermanVerbForm = {
	readonly kind: "Verb";
	/** The subject a table cell shows for orientation (`er`); no part of the form. */
	readonly pronoun?: string;
	/** The finite word: `fährt`, `hat`. A non-finite form has none. */
	readonly finite?: string;
	/**
	 * The other words of the form: a periphrasis's participle or infinitive
	 * (`gefahren` in `hat gefahren`), or a non-finite form's own word.
	 */
	readonly nonFinite?: string;
	/** The separable particle split off the finite word: `ab` in `fährt … ab`. */
	readonly particle?: string;
};

/** A form of the German Inflection Pack. */
export type GermanForm = GermanWordForm | GermanVerbForm;

/**
 * One run of a form's display, as `dumdict/inflection`'s `DisplayRun`
 * spells it: `Form` is the inflected word, `Context` a word shown beside it,
 * `Gap` the break in a discontinuous form.
 */
export type GermanDisplayRun = {
	readonly text: string;
	readonly role: "Form" | "Context" | "Gap";
};

/** The words a form spells, in the order a main clause has them. */
function wordsOf(form: GermanForm): string[] {
	if (form.kind === "Word") return [form.word];
	return [form.finite, form.nonFinite, form.particle].filter(
		(word) => word !== undefined && word !== "",
	) as string[];
}

/**
 * A form's key: its words without the Context a cell shows beside them,
 * folded as German folds letter case. A met `abfährt` and a derived
 * `er fährt … ab` are one form.
 */
export function germanFormKey(form: GermanForm): string {
	return foldCase(wordsOf(form).join(" "), "de");
}

/**
 * How a host shows a form: the article or pronoun as Context, the words as
 * Form, and a Gap before a particle split off a finite word, where a clause
 * puts its other words (`er fährt … ab`). A periphrasis is joined without a
 * Gap (`hat gefahren`). A lexical reflexive is never shown: it fills a
 * Reading's Reflexive Slot, not a form (ADR 0052).
 */
export function displayGermanForm(form: GermanForm): GermanDisplayRun[] {
	if (form.kind === "Word")
		return [
			...(form.article === undefined
				? []
				: [{ text: `${form.article} `, role: "Context" as const }]),
			{ text: form.word, role: "Form" },
		];
	const runs: GermanDisplayRun[] =
		form.pronoun === undefined
			? []
			: [{ text: `${form.pronoun} `, role: "Context" }];
	const words = [form.finite, form.nonFinite].filter(
		(word): word is string => word !== undefined && word !== "",
	);
	for (const [index, word] of words.entries())
		runs.push({ text: index === 0 ? word : ` ${word}`, role: "Form" });
	if (form.particle !== undefined && form.particle !== "") {
		if (form.finite !== undefined && words.length > 0)
			runs.push({ text: " … ", role: "Gap" });
		else if (words.length > 0) runs.push({ text: " ", role: "Form" });
		runs.push({ text: form.particle, role: "Form" });
	}
	return runs;
}

/** The finite words of haben, sein and werden a periphrasis opens with. */
const AUXILIARY =
	/^(?:hab(?:e|en|est|et|t)?|hast|hat|hatte(?:st|n|t)?|hätte(?:st|n|t)?|bin|bist|ist|sind|seid|sei(?:en|st|est|et)?|war(?:st|en|t)?|wär(?:e|st|est|en|t|et)?|werde(?:n|t|st)?|wirst|wird|wurde(?:st|n|t)?|würde(?:st|n|t)?)$/u;

type Bag = Readonly<Record<string, unknown>>;

const bagOf = (surface: Dumling.Surface<"de">): Bag =>
	("inflectionalFeatures" in surface
		? (surface.inflectionalFeatures as Bag | null)
		: null) ?? {};

/**
 * The form a met verb Surface spells. A Surface is its base-order form
 * (system ADR 0056): its verbal complex comes last in a subordinate
 * clause's order, the finite word last (`etabliert hat`, `anfängt`), or
 * first before an Ersatzinfinitiv (`hat reparieren lassen`); an imperative
 * keeps its own order (`komm herein`). Its words are told apart by the
 * Lemma's Core and the Surface's bundle: the separable particle, standing
 * apart (`übrig blieb`, `geh hinaus`) or joined to a finite word that is
 * no auxiliary (`anfängt`), and, in a periphrasis (`perfect`, `future`,
 * `passive` or a voice), the finite auxiliary. Its Surface leaves a
 * lexical reflexive out (ADR 0052).
 */
function verbFormOf(surface: Dumling.Surface<"de">): GermanVerbForm {
	const core: Bag = surface.lemma.coreFeatures;
	const bag = bagOf(surface);
	const particle =
		typeof core.hasSepPrefix === "string"
			? foldCase(core.hasSepPrefix, "de")
			: undefined;
	const words = surface.normalizedSurface.split(" ").filter(Boolean);
	let split: string | undefined;
	const rest: string[] = [];
	for (const word of words) {
		if (
			words.length > 1 &&
			split === undefined &&
			foldCase(word, "de") === particle
		)
			split = word;
		else rest.push(word);
	}
	const periphrastic =
		rest.length > 1 &&
		["perfect", "future", "passive", "voice"].some(
			(name) => bag[name] !== null && bag[name] !== undefined,
		);
	const finiteAt =
		bag.verbForm !== "Fin"
			? -1
			: bag.mood === "Imp"
				? 0
				: periphrastic
					? lastAuxiliaryOf(rest)
					: rest.length - 1;
	let finite = finiteAt < 0 ? undefined : rest[finiteAt];
	if (
		finite !== undefined &&
		split === undefined &&
		particle !== undefined &&
		!periphrastic &&
		foldCase(finite, "de").startsWith(particle) &&
		finite.length > particle.length
	) {
		split = finite.slice(0, particle.length);
		finite = finite.slice(particle.length);
	}
	const others = rest.filter((_, index) => index !== finiteAt).join(" ");
	return {
		kind: "Verb",
		...(finite === undefined ? {} : { finite }),
		...(others === "" ? {} : { nonFinite: others }),
		...(split === undefined ? {} : { particle: split }),
	};
}

/**
 * Where a periphrasis's finite word stands: its last auxiliary (`war` of
 * `verschifft worden war`, `wird` of `angekommen sein wird`), else its last
 * word (`geliefert bekommt`).
 */
function lastAuxiliaryOf(words: readonly string[]): number {
	for (let index = words.length - 1; index >= 0; index--)
		if (AUXILIARY.test(foldCase(words[index] ?? "", "de"))) return index;
	return words.length - 1;
}

/**
 * The definite article a met noun's cell shows, from its case, its number
 * and its Lemma's gender, as derived cells show it (`den Menschen`).
 */
function articleOf(surface: Dumling.Surface<"de">): string | undefined {
	if (surface.lemma.kind !== "NOUN") return undefined;
	const bag = bagOf(surface);
	const grammaticalCase = bag.case;
	const number = bag.number;
	if (
		typeof grammaticalCase !== "string" ||
		!(CASES as readonly string[]).includes(grammaticalCase) ||
		(number !== "Sing" && number !== "Plur")
	)
		return undefined;
	const genders =
		number === "Plur"
			? [null]
			: gendersOf((surface.lemma.coreFeatures as Bag).gender);
	const articles = genders.map((gender) =>
		definiteArticle(grammaticalCase as Case, number, gender),
	);
	return articles.length > 0 && articles.every((one) => one !== undefined)
		? [...new Set(articles)].join("/")
		: undefined;
}

/** The form a met Surface spells, as the pack's cells hold it. */
export function germanFormOfSurface(
	surface: Dumling.Surface<"de">,
): GermanForm {
	const { lemma } = surface;
	if (lemma.kind === "VERB" || lemma.kind === "AUX")
		return verbFormOf(surface);
	const article = articleOf(surface);
	return {
		kind: "Word",
		word: surface.normalizedSurface,
		...(article === undefined ? {} : { article }),
	};
}
