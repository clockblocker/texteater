import { cellKeyOf } from "dumling";
import type * as Dumrel from "dumrel/types";

import {
	Cells,
	type PackDerivedTable,
	type PackDeriveInput,
} from "../types.js";
import {
	CASES,
	type Case,
	definiteArticle,
	type Gender,
	type GrammaticalNumber,
} from "./articles.js";
import type { GermanWordForm } from "./forms.js";
import {
	distinct,
	endsWithSibilant,
	endsWithVowel,
	lower,
	syllableCount,
} from "./orthography.js";

/** Umlauts folded, so a plural compares with its singular: `häuser` → `hauser`. */
function withoutUmlauts(word: string): string {
	return word.replace(/ä/gu, "a").replace(/ö/gu, "o").replace(/ü/gu, "u");
}

/**
 * Whether a monosyllable ends in one vowel letter and one l, m, n or r.
 * Such a noun may be a loan that takes only `-s` (das Gen, des Gens; Gel,
 * Mol, Pol, Ren) or not (der Ton, des Tones), and its `-e` plural (Gene,
 * Töne) does not tell them apart.
 */
function mayTakeOnlyS(base: string): boolean {
	return /^[^aeiouyäöü]*[aeiouyäöü][lmnr]$/u.test(base);
}

/**
 * The genitive singular of a masculine or neuter noun, by the rules
 * measured in filler-de#62: `-es` after s, ß, x, z and sch, `-s` with an
 * S-plural, `-es` for a monosyllable, `-s` otherwise. Undefined wherever the
 * plurals leave the ending in doubt, rather than a guess:
 *
 * - a final vowel takes `-s` (Knie, Schnee, Auge);
 * - the suffix `-nis` doubles its s (des Verständnisses), unlike Tennis;
 * - another single final `s` takes `-es` only where a plural shows it
 *   (Preise, Häuser), doubles where a plural doubles it (Busse), and keeps
 *   the singular for a foreign `-us` (Rhythmus, Tourismus) or an unchanged
 *   plural (Status). Chaos, Kosmos, Atlas, Tennis and Applaus get none;
 * - another sibilant takes `-es` in a monosyllable (Pass, Fuß, Stress) or
 *   where a plural shows it, and keeps an unchanged plural's singular
 *   (Quiz). Business, Jazz and Kommerz get none;
 * - a monosyllable with no plural may be a loan that takes only `-s` (Rock,
 *   Golf, Smog), so it gets none, and so does one whose single vowel letter
 *   precedes one l, m, n or r (Gen, Ton) whatever its plural, unless an
 *   S-plural shows `-s` (Rens).
 *
 * A met genitive (`Gens`) fills the cell these leave Unknown.
 */
function masculineOrNeuterGenitive(
	singular: string,
	plurals: readonly string[],
): string | undefined {
	const base = lower(singular);
	const shape = shapeOf(base, plurals);
	if (endsWithVowel(base)) return `${singular}s`;
	if (/[^aeiouyäöün]nis$/u.test(base)) return `${singular}ses`;
	if (base.endsWith("s") && !base.endsWith("ss"))
		return singleSGenitive(singular, shape);
	if (endsWithSibilant(base) || base.endsWith("sch")) {
		if (shape.unchanged) return singular;
		if (base.endsWith("zz")) return undefined;
		return shape.monosyllable || shape.extended
			? `${singular}es`
			: undefined;
	}
	if (shape.folded.includes(`${shape.stem}s`)) return `${singular}s`;
	if (shape.monosyllable)
		return plurals.length > 0 && !mayTakeOnlyS(base)
			? `${singular}es`
			: undefined;
	return `${singular}s`;
}

/** What a noun's plurals show of its singular, umlauts folded. */
type PluralShape = {
	readonly stem: string;
	readonly folded: readonly string[];
	/** A plural adds to the singular: Preise, Häuser. */
	readonly extended: boolean;
	/** A plural is the singular: Status, Quiz. */
	readonly unchanged: boolean;
	readonly monosyllable: boolean;
};

function shapeOf(base: string, plurals: readonly string[]): PluralShape {
	const stem = withoutUmlauts(base);
	const folded = plurals.map((plural) => withoutUmlauts(lower(plural)));
	return {
		stem,
		folded,
		extended: folded.some(
			(plural) => plural.length > stem.length && plural.startsWith(stem),
		),
		unchanged: folded.includes(stem),
		monosyllable: syllableCount(base) === 1,
	};
}

/** The genitive of a noun in one final `s` (Preis, Bus, Rhythmus, Chaos). */
function singleSGenitive(
	singular: string,
	shape: PluralShape,
): string | undefined {
	if (shape.folded.some((plural) => plural.startsWith(`${shape.stem}s`)))
		return `${singular}ses`;
	if (shape.extended) return `${singular}es`;
	if (
		shape.unchanged ||
		(!shape.monosyllable && /[^aeiouyäöü]us$/u.test(lower(singular)))
	)
		return singular;
	return undefined;
}

/**
 * The dative plural adds `-n` unless the plural ends in `-n`, `-s` or a vowel
 * other than `e`: Tagen, Fahrern, but Teams, Kommata.
 */
function dativePlural(plural: string): string {
	return /[nsaiouyäöü]$/iu.test(plural) ? plural : `${plural}n`;
}

/**
 * A neuter in `-e` with no plural may be an adjective used as a noun (das
 * Böse, des Bösen, dem Bösen) or not (das Getreide, des Getreides), so its
 * genitive and dative singular are in doubt.
 */
function mayBeAdjectival(
	singular: string,
	gender: Gender,
	plurals: readonly string[],
): boolean {
	return (
		gender === "Neut" &&
		plurals.length === 0 &&
		/[^aeiouyäöü]e$/u.test(lower(singular))
	);
}

/** A strong singular cell's form; undefined where it is in doubt. */
function singularForm(
	grammaticalCase: Case,
	gender: Gender,
	singular: string,
	plurals: readonly string[],
): string | undefined {
	if (grammaticalCase === "Nom" || grammaticalCase === "Acc") return singular;
	if (gender === "Fem") return singular;
	if (mayBeAdjectival(singular, gender, plurals)) return undefined;
	if (grammaticalCase === "Dat") return singular;
	return masculineOrNeuterGenitive(singular, plurals);
}

/**
 * Whether the plurals leave it open that the noun follows the
 * n-Deklination. A masculine noun with an -(e)n plural or a final `-e` may
 * be weak (Mensch, des Menschen; Glaube, des Glaubens) or not (Staat, des
 * Staates; Käse, des Käses), and Herz declines like a weak noun. No weak
 * form is ever derived, so its oblique singular cells stay Unknown and only
 * met forms fill them.
 */
export function nDeclensionUnknown(
	singular: string,
	genders: readonly Gender[],
	plurals: readonly string[],
): boolean {
	const base = lower(singular);
	const enPlural = plurals.some(
		(plural) =>
			lower(plural) === `${base}n` || lower(plural) === `${base}en`,
	);
	if (genders.includes("Masc"))
		return enPlural || (base.endsWith("e") && !base.endsWith("ee"));
	// Herz (des Herzens) stays weak whatever plural is stored.
	return genders.includes("Neut") && base.endsWith("herz");
}

/** One certain derived singular form of a case, or none. */
function singularOf(
	grammaticalCase: Case,
	singular: string,
	genders: readonly Gender[],
	plurals: readonly string[],
): string | undefined {
	if (
		nDeclensionUnknown(singular, genders, plurals) &&
		grammaticalCase !== "Nom"
	)
		return undefined;
	const derived = genders.map((gender) =>
		singularForm(grammaticalCase, gender, singular, plurals),
	);
	// A form in doubt, or genders that disagree on the form, leave it out.
	if (derived.some((form) => form === undefined)) return undefined;
	const forms = distinct(derived as string[]);
	return forms.length === 1 ? forms[0] : undefined;
}

const GENDERS: ReadonlySet<string> = new Set(["Fem", "Masc", "Neut"]);

/** NOUN Core `gender`: one, the members of a `mixed` gender, or none. */
export function gendersOf(value: unknown): Gender[] {
	if (typeof value === "string")
		return GENDERS.has(value) ? [value as Gender] : [];
	const members = (value as { mixed?: unknown } | null)?.mixed;
	return Array.isArray(members)
		? members.filter((member): member is Gender => GENDERS.has(member))
		: [];
}

const isMarker = (value: string) =>
	value === "NoPlural" || value === "PluralOnly";

/**
 * A German noun's declension for one Licence Group, from its Canonical Form,
 * Core gender and the `plural` variants it licenses, with the definite
 * article as Context:
 *
 * - each licensed plural fills every plural cell, `-n` added in the dative
 *   by rule (Tage, Tagen); `NoPlural` makes the plural cells Absent, and
 *   `PluralOnly` the singular ones, its plural being the Canonical Form;
 * - the nominative singular is the Lemma, a feminine singular never changes,
 *   and the other singular cells follow the rules above, which read the
 *   group's plurals.
 *
 * A cell in doubt is left out, never guessed: no weak (n-Deklination) form
 * is derived. Without a `plural` dimension, or without a gender, nothing is
 * derived and a met form fills what it attests.
 */
export function declineGermanNoun({
	lemma,
	selection,
	schema,
}: PackDeriveInput<"de">): PackDerivedTable<GermanWordForm> {
	const cells = new Cells<GermanWordForm>();
	const variants = selection.plural;
	if (variants === undefined || variants.length === 0) return cells.table;
	const key = (grammaticalCase: Case, number: GrammaticalNumber) =>
		cellKeyOf({ case: grammaticalCase, number }, schema.keyFeatures);
	const singular = lemma.canonicalForm;
	const forms = variants.filter((variant) => !isMarker(variant.value));
	const ref = (variant: Dumrel.ParadigmVariant) => ({
		dimension: "plural" as const,
		id: variant.id,
	});
	const pluralCell = (
		grammaticalCase: Case,
		plural: string,
		variant: Dumrel.ParadigmVariant,
		stored: boolean,
	) => {
		const article = definiteArticle(grammaticalCase, "Plur", null);
		if (article === undefined) return;
		const word = grammaticalCase === "Dat" ? dativePlural(plural) : plural;
		cells.add(key(grammaticalCase, "Plur"), {
			form: { kind: "Word", article, word },
			provenance: stored && word === plural ? "Variant" : "Rule",
			variant: ref(variant),
		});
	};
	const pluralOnly = variants.find(
		(variant) => variant.value === "PluralOnly",
	);
	if (forms.length === 0 && pluralOnly !== undefined) {
		for (const grammaticalCase of CASES) {
			cells.absent(key(grammaticalCase, "Sing"));
			pluralCell(grammaticalCase, singular, pluralOnly, false);
		}
		return cells.table;
	}
	const genders = gendersOf(
		(lemma.coreFeatures as Readonly<Record<string, unknown>>).gender,
	);
	if (genders.length === 0) return cells.table;
	const plurals = forms.map((variant) => variant.value);
	for (const grammaticalCase of CASES) {
		const articles = genders.map((gender) =>
			definiteArticle(grammaticalCase, "Sing", gender),
		);
		const word = singularOf(grammaticalCase, singular, genders, plurals);
		if (word !== undefined && articles.every((one) => one !== undefined))
			cells.add(key(grammaticalCase, "Sing"), {
				form: {
					kind: "Word",
					article: distinct(articles as string[]).join("/"),
					word,
				},
				provenance: "Rule",
			});
		if (forms.length === 0) cells.absent(key(grammaticalCase, "Plur"));
		for (const variant of forms)
			pluralCell(grammaticalCase, variant.value, variant, true);
	}
	return cells.table;
}
