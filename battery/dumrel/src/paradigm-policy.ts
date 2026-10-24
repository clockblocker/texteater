import { foldCase, normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import type { DimensionId } from "./generated/types.js";
import { pluralMarkerValues } from "./vocabulary.js";

/**
 * How one Variation Dimension's values are spelled: the markers it may hold
 * instead of a form, and why a form is not one a dictionary cites, if it
 * isn't.
 */
type DimensionRule = {
	readonly markers: readonly string[];
	readonly formIssue: (
		form: string,
		lemma: Dumling.Lemma,
	) => string | undefined;
};

/**
 * One language's Paradigm Policy: the Variation Dimensions each source route's
 * Lemmas have, keyed by Family and Kind, so a key that names no route fails
 * to type-check.
 */
type ParadigmPolicy<L extends Dumling.Language> = {
	readonly [F in Dumling.Family<L>]?: {
		readonly [K in Dumling.Kind<L, F>]?: readonly DimensionId[];
	};
};
type RouteLookup = Readonly<
	Record<string, Readonly<Record<string, readonly DimensionId[]>>>
>;

/** The separable particle a German VERB Lemma names in Core, or undefined. */
function separablePrefixOf(lemma: Dumling.Lemma): string | undefined {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return typeof core.hasSepPrefix === "string"
		? foldCase(core.hasSepPrefix, "de")
		: undefined;
}

/**
 * Why a German finite form is not one a dictionary cites, or undefined: one
 * word, or a separable verb's finite word and its particle split off (`stand
 * auf`), never `sich`, its finite word ending as `ending` requires.
 */
function finiteFormIssue(
	name: string,
	ending?: { readonly test: RegExp; readonly message: string },
) {
	return (form: string, lemma: Dumling.Lemma): string | undefined => {
		const particle = separablePrefixOf(lemma);
		const words = foldCase(form, "de").split(" ");
		const fits =
			words.every((word) => /^\S+$/u.test(word) && word !== "sich") &&
			(particle === undefined
				? words.length === 1
				: words.length === 2 && words[1] === particle);
		if (!fits)
			return particle === undefined
				? `A ${name} form is one word, without a reflexive pronoun`
				: `A separable verb's ${name} form is its finite word and its particle split off, without a reflexive pronoun: «… ${particle}»`;
		if (ending && !ending.test.test(words[0] ?? "")) return ending.message;
		return undefined;
	};
}

/**
 * Why a Partizip II is not one a dictionary cites, or undefined: one word
 * ending in -t or -n, a separable verb's opening with its particle
 * (`abgefahren`), never `sich`.
 */
function participleIssue(
	form: string,
	lemma: Dumling.Lemma,
): string | undefined {
	const particle = separablePrefixOf(lemma);
	const folded = foldCase(form, "de");
	if (
		/^\S+[tn]$/u.test(folded) &&
		(particle === undefined ||
			(folded.startsWith(particle) && folded.length > particle.length))
	)
		return undefined;
	return particle === undefined
		? "A Partizip II is one word ending in -t or -n, without a reflexive pronoun"
		: `A separable verb's Partizip II is one word that opens with its particle «${particle}…» and ends in -t or -n`;
}

/** A plural form is any form a writer cites (`Mütter`, `Pizzas`); Dumrel can be sure of nothing more. */
const pluralFormIssue = (): undefined => undefined;

/**
 * The German dimensions (ADR 0038). Dumrel checks each variant only for what
 * it can be sure of: a second person Präsens ends in -t, a Partizip II in -t
 * or -n and a Konjunktiv II in -e. It checks no dimension against another,
 * since free alternatives mix across dimensions (`melkte` with `gemolken`).
 */
const germanRules: Readonly<Record<DimensionId, DimensionRule>> = {
	plural: { markers: pluralMarkerValues, formIssue: pluralFormIssue },
	preterite: { markers: [], formIssue: finiteFormIssue("Präteritum") },
	present1: { markers: [], formIssue: finiteFormIssue("Präsens") },
	present2: {
		markers: [],
		formIssue: finiteFormIssue("Präsens", {
			test: /t$/u,
			message:
				"A second person singular Präsens form's finite word ends in -t",
		}),
	},
	present3: { markers: [], formIssue: finiteFormIssue("Präsens") },
	pastParticiple: { markers: [], formIssue: participleIssue },
	subjunctivePast: {
		markers: [],
		formIssue: finiteFormIssue("Konjunktiv II", {
			test: /e$/u,
			message: "A Konjunktiv II form's finite word ends in -e",
		}),
	},
};

/** A noun's plural forms; a verb's principal parts, each a dimension of its own. */
const nominal = ["plural"] as const;
const verbal = [
	"preterite",
	"present1",
	"present2",
	"present3",
	"pastParticiple",
	"subjunctivePast",
] as const;

const paradigmPolicies: {
	readonly [L in Dumling.Language]?: ParadigmPolicy<L>;
} = {
	de: { Lexeme: { NOUN: nominal, VERB: verbal } },
};
const rules: {
	readonly [L in Dumling.Language]?: Readonly<
		Record<DimensionId, DimensionRule>
	>;
} = {
	de: germanRules,
};

/**
 * The Variation Dimensions a route's Paradigm Policy names, in policy order
 * (ADR 0048): a German NOUN has `plural`, and a German VERB `preterite`,
 * `present1`, `present2`, `present3`, `pastParticiple` and
 * `subjunctivePast`. Every other route has none, so its Lemmas have no
 * Paradigm and derive their forms from the language's rules alone.
 */
export function paradigmDimensions(
	route: Dumling.LemmaRoute,
): readonly DimensionId[] {
	const policies: Readonly<Record<string, RouteLookup | undefined>> =
		paradigmPolicies;
	const policy = Object.hasOwn(policies, route.language)
		? policies[route.language]
		: undefined;
	const kinds =
		policy && Object.hasOwn(policy, route.family)
			? policy[route.family]
			: undefined;
	return kinds && Object.hasOwn(kinds, route.kind)
		? (kinds[route.kind] ?? [])
		: [];
}

/** The rule of a dimension the Lemma's route names, or undefined. */
function ruleOf(
	lemma: Dumling.Lemma,
	dimension: DimensionId,
): DimensionRule | undefined {
	if (!paradigmDimensions(lemma).includes(dimension)) return undefined;
	return rules[lemma.language]?.[dimension];
}

/** Whether a value is one of its dimension's markers, such as `NoPlural`. */
export function isMarker(
	lemma: Dumling.Lemma,
	dimension: DimensionId,
	value: string,
): boolean {
	return ruleOf(lemma, dimension)?.markers.includes(value) ?? false;
}

/**
 * Why a value is no Paradigm Variant of this Lemma's dimension, or undefined:
 * the route names no such dimension, or the form is not one a dictionary
 * cites.
 */
export function variantValueIssue(
	lemma: Dumling.Lemma,
	dimension: DimensionId,
	value: string,
): string | undefined {
	const rule = ruleOf(lemma, dimension);
	if (rule === undefined)
		return `A ${lemma.language} ${lemma.family} ${lemma.kind} Lemma has no ${dimension} dimension`;
	if (value === "" || value !== normalizeForm(value))
		return "A Paradigm Variant's value is normalized and not empty";
	return rule.markers.includes(value)
		? undefined
		: rule.formIssue(value, lemma);
}

/**
 * A Paradigm Variant's id: the content key of its value, so two writers that
 * add `Banken` add one variant (ADR 0048). A form is keyed normalized and
 * case-folded by its language's rules (`Banken` and `banken` are one
 * variant); a marker is its own key.
 */
export function variantIdOf(
	lemma: Dumling.Lemma,
	dimension: DimensionId,
	value: string,
): string {
	const normalized = normalizeForm(value);
	return isMarker(lemma, dimension, normalized)
		? normalized
		: foldCase(normalized, lemma.language);
}
