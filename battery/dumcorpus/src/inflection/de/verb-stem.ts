import { germanInseparablePrefixes } from "../../inventories/de/verb-prefixes.js";
import {
	endsWithSibilant,
	hasVowel,
	lower,
	syllableCount,
} from "./orthography.js";

export const PERSONS = ["ich", "du", "er", "wir", "ihr", "sie"] as const;
export type Person = (typeof PERSONS)[number];

export const REFLEXIVE: Readonly<
	Record<"Acc" | "Dat", Record<Person, string>>
> = {
	Acc: {
		du: "dich",
		er: "sich",
		ich: "mich",
		ihr: "euch",
		sie: "sich",
		wir: "uns",
	},
	Dat: {
		du: "dir",
		er: "sich",
		ich: "mir",
		ihr: "euch",
		sie: "sich",
		wir: "uns",
	},
};

/**
 * Prefixes that also form inseparable verbs. A verb whose Core names no
 * separable prefix and that starts with one is inseparable (übersetzen,
 * unterschreiben), so its participle takes no `ge-`.
 */
const DUAL_PREFIXES = [
	"durch",
	"hinter",
	"über",
	"um",
	"unter",
	"voll",
	"wider",
	"wieder",
] as const;

export type Stem = {
	/** The infinitive without particle or `sich`. */
	readonly infinitive: string;
	/** `pass`, `hüt`, `sammel`, `wander`. */
	readonly stem: string;
	/** `-eln` and `-ern` verbs keep their `e` and end the infinitive in `-n`. */
	readonly kind: "regular" | "el" | "er";
	/** Endings beginning with a consonant take an `e`: hütest, rechnet. */
	readonly needsE: boolean;
};

/**
 * A stem whose endings need a linking `e`: one in t or d, or in m or n after
 * another consonant that is not l, r, m, n or a lengthening h (atmen,
 * rechnen, öffnen; not filmen, lärmen, wohnen).
 */
function needsLinkingE(stem: string): boolean {
	const word = lower(stem);
	if (/[td]$/u.test(word)) return true;
	const match = /([^aeiouyäöü])([mn])$/u.exec(word);
	if (match === null) return false;
	const before = match[1] ?? "";
	if ("lrmn".includes(before)) return false;
	if (before === "h") return !/[aeiouyäöü]h[mn]$/u.test(word);
	return true;
}

/** The stem of an infinitive, or undefined for one no rule here spells. */
export function analyze(infinitive: string): Stem | undefined {
	const word = lower(infinitive);
	let stem: string;
	let kind: Stem["kind"] = "regular";
	if (word.endsWith("eln")) {
		stem = infinitive.slice(0, -1);
		kind = "el";
	} else if (word.endsWith("ern")) {
		stem = infinitive.slice(0, -1);
		kind = "er";
	} else if (/[^e]ien$/u.test(word))
		// knien keeps its stem's e (ich knie), which no rule here spells.
		return undefined;
	else if (word.endsWith("en")) stem = infinitive.slice(0, -2);
	else if (word.endsWith("n")) stem = infinitive.slice(0, -1);
	else return undefined;
	// The `e` of -eln and -ern is no stem vowel: entern is no ent- verb.
	if (!hasVowel(kind === "regular" ? stem : stem.slice(0, -2)))
		return undefined;
	return {
		infinitive,
		kind,
		needsE: kind === "regular" && needsLinkingE(stem),
		stem,
	};
}

/**
 * Whether the infinitive starts with an inseparable prefix (be-, ver-, …)
 * or a dual one, before a stem that is a verb in its own right:
 * `vernachlässigen` and `besuchen` do, `beten`, `ernten` and `bellen` do
 * not. After be- or ge-, an i or u may open the stem (beurteilen,
 * beinhalten) or a diphthong of a plain verb (beugen, geigen), so the
 * answer there is unknown.
 */
function prefixStatus(infinitive: string): "inseparable" | "none" | "unknown" {
	const word = lower(infinitive);
	let status: "inseparable" | "none" | "unknown" = "none";
	for (const prefix of [...germanInseparablePrefixes, ...DUAL_PREFIXES]) {
		if (!word.startsWith(prefix)) continue;
		const rest = word.slice(prefix.length);
		if (/^(.)\1/u.test(rest) || analyze(rest) === undefined) continue;
		if (prefix.endsWith("e") && /^[iu]/u.test(rest)) status = "unknown";
		else return "inseparable";
	}
	return status;
}

/**
 * Verbs whose Präteritum is weak but whose participle is strong
 * (backte, gebacken), so no `-te` form gives it.
 */
const STRONG_PARTICIPLES: ReadonlySet<string> = new Set([
	"backen",
	"hauen",
	"mahlen",
	"melken",
	"salzen",
	"schinden",
	"sieden",
	"spalten",
	"weben",
]);

export function hasStrongParticiple(infinitive: string): boolean {
	const word = lower(infinitive);
	return (
		STRONG_PARTICIPLES.has(word) ||
		[...germanInseparablePrefixes].some(
			(prefix) =>
				word.startsWith(prefix) &&
				STRONG_PARTICIPLES.has(word.slice(prefix.length)),
		)
	);
}

/**
 * The syllables of a stem before its unstressed endings: the `e` of -eln
 * and -ern and a final `-ig` (`sammel` → `samm`, `kündig` → `künd`).
 */
function rootSyllables(stem: Stem): number {
	const root = stem.kind === "regular" ? stem.stem : stem.stem.slice(0, -2);
	const unsuffixed = root.replace(/ig$/iu, "");
	return syllableCount(hasVowel(unsuffixed) ? unsuffixed : root);
}

/**
 * Whether the participle takes `ge-`, which only a stressed first syllable
 * takes. It does not after an inseparable prefix or for a verb in stressed
 * `-ieren` (ignoriert, but geschmiert), and does for a verb with no prefix
 * whose root is one syllable, which carries the stress (gepasst,
 * gehandelt, gekündigt). Undefined when that cannot be told: a longer
 * root may stress its first syllable (gearbeitet) or not (trompetet,
 * posaunt, prophezeit), and only a dictionary knows which.
 */
export function takesGe(stem: Stem): boolean | undefined {
	const { infinitive } = stem;
	if (/[aeiouyäöü][^aeiouyäöü]*ieren$/u.test(lower(infinitive))) return false;
	const status = prefixStatus(infinitive);
	if (status === "unknown") return undefined;
	if (status === "inseparable") return false;
	return rootSyllables(stem) === 1 ? true : undefined;
}

/** The regular Präsens of each person. */
export function presentForms(stem: Stem): Record<Person, string> {
	const { infinitive, kind, needsE } = stem;
	const base = stem.stem;
	if (kind === "el")
		return {
			du: `${base}st`,
			er: `${base}t`,
			ich: `${base.slice(0, -2)}le`,
			ihr: `${base}t`,
			sie: infinitive,
			wir: infinitive,
		};
	const third = `${base}${needsE ? "et" : "t"}`;
	return {
		du: needsE
			? `${base}est`
			: endsWithSibilant(base)
				? `${base}t`
				: `${base}st`,
		er: third,
		ich: `${base}e`,
		ihr: third,
		sie: infinitive,
		wir: infinitive,
	};
}

/**
 * The person forms of a Präteritum from its third person singular, or of a
 * Konjunktiv II, which ends in -e and so takes a -te Präteritum's endings
 * (führe, führest, führen).
 */
export function pastForms(finite: string): Record<Person, string> {
	if (finite.endsWith("e"))
		return {
			du: `${finite}st`,
			er: finite,
			ich: finite,
			ihr: `${finite}t`,
			sie: `${finite}n`,
			wir: `${finite}n`,
		};
	const dental = /[td]$/u.test(finite);
	return {
		du: dental || endsWithSibilant(finite) ? `${finite}est` : `${finite}st`,
		er: finite,
		ich: finite,
		ihr: dental ? `${finite}et` : `${finite}t`,
		sie: `${finite}en`,
		wir: `${finite}en`,
	};
}

export function imperativeSingular(stem: Stem): string {
	if (stem.kind === "el") return `${stem.stem.slice(0, -2)}le`;
	if (stem.kind === "er") return `${stem.stem}e`;
	return stem.needsE || /ig$/u.test(lower(stem.stem))
		? `${stem.stem}e`
		: stem.stem;
}

/** A stored finite form's finite word; undefined if its particle is not the verb's. */
export function finiteOf(
	form: string,
	particle: string | null,
): string | undefined {
	const [finite, ...rest] = form.split(" ");
	if (finite === undefined || finite.length === 0) return undefined;
	const split = rest.join(" ");
	if (particle === null) return split.length === 0 ? finite : undefined;
	return lower(split) === lower(particle) ? finite : undefined;
}

/**
 * Whether a stored Partizip II fits the verb: one word that, for a
 * separable verb, opens with its particle (`abgefahren`).
 */
export function fitsParticiple(form: string, particle: string | null): boolean {
	return (
		/^\S+$/u.test(form) &&
		(particle === null ||
			(lower(form).startsWith(lower(particle)) &&
				form.length > particle.length))
	);
}
