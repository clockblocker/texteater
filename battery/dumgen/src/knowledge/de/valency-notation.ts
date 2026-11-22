/**
 * The German word table of the concrete valency pattern notation
 * (`../valency-notation.ts`), in case letters: one realized Valency Pattern
 * as Luna proposes it, each preposition its Canonical Form, written as
 * `N A nach D` or `N auf dass`, and read back. `germanPatternRegex` is the
 * same language as one regular expression, which Luna's answer is held to (a
 * strict schema's `pattern`), and `parseGermanPattern` reads exactly the
 * patterns it holds.
 *
 * - A Case complement is the letter of its case: N (Nom), A (Acc), D (Dat),
 *   G (Gen).
 * - A Preposition complement is a preposition a governor selects, a space
 *   and the letter of a case the ADP Case Table lets it govern before its
 *   complement: `auf A`, `auf D`, `mit D`, never `mit A`.
 * - A Reflexive is `sich(A)` or `sich(D)`, in a fixed phrase after its
 *   preposition (`außer sich(D)`).
 * - A Clause is `dass`, `ob`, `w`, `zu+Inf` or `Inf`, preceded by the
 *   correlate preposition when a `da(r)-` pronominal adverb anticipates it
 *   (`auf dass`, `an zu+Inf`, `über ob`).
 * - An Adverbial is its stand-in: `irgendwo`, `irgendwohin`, `irgendwie`,
 *   `irgendwie lange`, `irgendwie viel`.
 * - A Predicative is `ADJ`, `als ADJ` or `für ADJ`.
 * - A verb pattern with no Nom (an expletive es subject) opens with `es`
 *   (`es D irgendwie`, `es auf A`, `es dass`); an empty pattern is `-`.
 */
import { canonicalJson } from "common-utils";
import {
	germanAdpositionEntry,
	germanGovernablePrepositions,
} from "dumcorpus/inventories";
import type * as Dumrel from "dumrel/types";
import {
	type PatternWords,
	parsePattern,
	printPattern,
	type RawComplement,
	type RawPattern,
} from "../valency-notation.js";

type CaseName = "Nom" | "Acc" | "Dat" | "Gen";
type PrepositionCase = Exclude<CaseName, "Nom">;

/** A complement as Luna proposes it: a preposition is its Canonical Form. */
export type ProposedComplement =
	| { readonly kind: "Case"; readonly governedCase: CaseName }
	| {
			readonly kind: "Preposition";
			readonly preposition: string;
			readonly governedCase: PrepositionCase;
	  }
	| {
			readonly kind: "Adverbial";
			readonly standIn:
				| "Irgendwo"
				| "Irgendwohin"
				| "Irgendwie"
				| "IrgendwieLange"
				| "IrgendwieViel";
	  }
	| {
			readonly kind: "Predicative";
			readonly marker: "None" | "Als" | "Für";
	  }
	| {
			readonly kind: "Clause";
			readonly form:
				| "ZuInfinitive"
				| "BareInfinitive"
				| "Dass"
				| "Ob"
				| "W";
			readonly preposition?: string;
	  }
	| {
			readonly kind: "Reflexive";
			readonly governedCase: "Acc" | "Dat";
			readonly preposition?: string;
	  };

export type ProposedPattern = readonly ProposedComplement[];

/**
 * What decides how a pattern is written: whether its Lemma is a verb, whose
 * subjectless pattern opens with `es`.
 */
export type PatternContext = { readonly verb: boolean };

type GermanParse =
	| { readonly ok: true; readonly pattern: ProposedComplement[] }
	| { readonly ok: false; readonly error: string };

const caseLetter: Readonly<Record<CaseName, string>> = {
	Nom: "N",
	Acc: "A",
	Dat: "D",
	Gen: "G",
};
const caseOfLetter = new Map(
	Object.entries(caseLetter).map(([name, letter]) => [
		letter,
		name as CaseName,
	]),
);
const reflexiveCaseOfLetter = { A: "Acc", D: "Dat" } as const;

const clauseWord = {
	Dass: "dass",
	Ob: "ob",
	W: "w",
	ZuInfinitive: "zu+Inf",
	BareInfinitive: "Inf",
} as const;
const clauseOfWord = new Map<string, keyof typeof clauseWord>(
	Object.entries(clauseWord).map(([form, word]) => [
		word,
		form as keyof typeof clauseWord,
	]),
);

const adverbialWords = {
	Irgendwo: "irgendwo",
	Irgendwohin: "irgendwohin",
	Irgendwie: "irgendwie",
	IrgendwieLange: "irgendwie lange",
	IrgendwieViel: "irgendwie viel",
} as const;
const adverbialOfWords = new Map<string, keyof typeof adverbialWords>(
	Object.entries(adverbialWords).map(([standIn, words]) => [
		words,
		standIn as keyof typeof adverbialWords,
	]),
);

const predicative = "ADJ";
const markerWord = { Als: "als", Für: "für" } as const;
const markerOfPrefix: Readonly<Record<string, "Als" | "Für">> = {
	als: "Als",
	für: "Für",
};

/**
 * Each preposition a governor selects, with the cases the ADP Case Table
 * lets it govern before its complement, in letter order: the only
 * Preposition complements and Clause correlates the notation writes.
 */
const governedCases: ReadonlyMap<string, readonly PrepositionCase[]> = new Map(
	germanGovernablePrepositions.map((preposition) => {
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: preposition,
		});
		const allowed =
			entry?.family === "Lexeme"
				? (entry.positions.Prep?.allowed ?? [])
				: [];
		return [
			preposition,
			(["Acc", "Dat", "Gen"] as const).filter((name) =>
				allowed.includes(name),
			),
		];
	}),
);

/**
 * The prepositions a fixed phrase's Reflexive may follow (`außer sich`):
 * the governable ones and the few only a fixed phrase takes.
 */
const fixedPhrasePrepositions: readonly string[] = [
	...germanGovernablePrepositions,
	"außer",
	"hinter",
	"neben",
	"ohne",
];

const reflexivePattern = /^sich\((A|D)\)$/u;
const isHead = (word: string) =>
	caseOfLetter.has(word) ||
	reflexivePattern.test(word) ||
	clauseOfWord.has(word) ||
	word === predicative;

const germanWords: PatternWords = {
	isPrefix: (word) =>
		word === "als" ||
		word === "für" ||
		fixedPhrasePrepositions.includes(word),
	headLength: (words, index) => {
		const word = words[index];
		if (word === undefined) return 0;
		const pair = `${word} ${words[index + 1] ?? ""}`;
		if (adverbialOfWords.has(pair)) return 2;
		if (adverbialOfWords.has(word)) return 1;
		return isHead(word) ? 1 : 0;
	},
	isOpener: (word) => word === "es",
	empty: "-",
};

/** A complement read, or why it is none. */
type Read = ProposedComplement | string;

function clauseOf(
	{ head, prefix }: RawComplement,
	form: keyof typeof clauseWord,
): Read {
	if (prefix === undefined) return { kind: "Clause", form };
	return governedCases.has(prefix)
		? { kind: "Clause", form, preposition: prefix }
		: `«${prefix} ${head}»: ${prefix} is no preposition a governor selects`;
}

function predicativeOf({ head, prefix }: RawComplement): Read {
	const marker = prefix === undefined ? "None" : markerOfPrefix[prefix];
	return marker === undefined
		? `«${prefix} ${head}» is no predicative`
		: { kind: "Predicative", marker };
}

function reflexiveOf(
	{ head, prefix }: RawComplement,
	governedCase: "Acc" | "Dat",
): Read {
	if (prefix === undefined) return { kind: "Reflexive", governedCase };
	return fixedPhrasePrepositions.includes(prefix)
		? { kind: "Reflexive", governedCase, preposition: prefix }
		: `«${prefix} ${head}» is no fixed phrase's reflexive`;
}

/**
 * A Case complement, or a Preposition one when a preposition a governor
 * selects stands before the letter of a case it governs there.
 */
function caseComplementOf(
	{ head, prefix }: RawComplement,
	written: CaseName,
): Read {
	if (prefix === undefined) return { kind: "Case", governedCase: written };
	const cases = governedCases.get(prefix);
	if (cases === undefined)
		return `«${prefix} ${head}»: ${prefix} is no preposition a governor selects`;
	const governed = cases.find((name) => name === written);
	return governed === undefined
		? `«${prefix} ${head}»: ${prefix} governs no ${written} before its complement`
		: { kind: "Preposition", preposition: prefix, governedCase: governed };
}

/** One complement as written, or why it is none. */
function complementOf(raw: RawComplement): Read {
	const { head, prefix } = raw;
	const clause = clauseOfWord.get(head);
	if (clause !== undefined) return clauseOf(raw, clause);
	const standIn = adverbialOfWords.get(head);
	if (standIn !== undefined)
		return prefix === undefined
			? { kind: "Adverbial", standIn }
			: `«${prefix} ${head}» is no adverbial`;
	if (head === predicative) return predicativeOf(raw);
	const reflexive = head.match(reflexivePattern)?.[1];
	if (reflexive === "A" || reflexive === "D")
		return reflexiveOf(raw, reflexiveCaseOfLetter[reflexive]);
	const written = caseOfLetter.get(head);
	return written === undefined
		? `«${head}» is no complement`
		: caseComplementOf(raw, written);
}

/**
 * Reads a German concrete pattern in the notation: exactly the patterns
 * `germanPatternRegex` holds, as the complements they write. A leading `es`
 * says only that the pattern has no subject, which its complements already
 * show.
 */
export function parseGermanPattern(text: string): GermanParse {
	const parsed = parsePattern(text, germanWords);
	if (!parsed.ok) return parsed;
	const pattern: ProposedComplement[] = [];
	for (const raw of parsed.pattern.complements) {
		const read = complementOf(raw);
		if (typeof read === "string") return { ok: false, error: read };
		pattern.push(read);
	}
	return { ok: true, pattern };
}

function rawComplementOf(complement: ProposedComplement): RawComplement {
	switch (complement.kind) {
		case "Case":
			return { head: caseLetter[complement.governedCase] };
		case "Preposition":
			return {
				prefix: complement.preposition,
				head: caseLetter[complement.governedCase],
			};
		case "Reflexive":
			return {
				head: `sich(${caseLetter[complement.governedCase]})`,
				...(complement.preposition === undefined
					? {}
					: { prefix: complement.preposition }),
			};
		case "Clause":
			return {
				head: clauseWord[complement.form],
				...(complement.preposition === undefined
					? {}
					: { prefix: complement.preposition }),
			};
		case "Adverbial":
			return { head: adverbialWords[complement.standIn] };
		case "Predicative":
			return complement.marker === "None"
				? { head: predicative }
				: { prefix: markerWord[complement.marker], head: predicative };
	}
}

/**
 * A pattern's structure in the notation's German words: a verb's pattern
 * with no Nom has no subject, and opens with `es`.
 */
function rawPatternOf(
	pattern: ProposedPattern,
	context: PatternContext,
): RawPattern {
	const subjectless =
		context.verb &&
		pattern.length > 0 &&
		!pattern.some(
			(complement) =>
				complement.kind === "Case" && complement.governedCase === "Nom",
		);
	return {
		...(subjectless ? { opener: "es" } : {}),
		complements: pattern.map(rawComplementOf),
	};
}

/** Writes a German concrete pattern in the notation. */
export function printGermanPattern(
	pattern: ProposedPattern,
	context: PatternContext,
): string {
	return printPattern(rawPatternOf(pattern, context), germanWords);
}

/** Converts a Dumrel German ValencyComplement into the notation's ProposedComplement. */
export function proposedComplementOf(
	complement: Dumrel.GermanValencyComplement,
): ProposedComplement {
	if (complement.kind === "Preposition")
		return {
			kind: "Preposition",
			preposition: complement.preposition.canonicalForm,
			governedCase: complement.governedCase,
		};
	if (complement.kind === "Reflexive")
		return complement.preposition === undefined
			? { kind: "Reflexive", governedCase: complement.governedCase }
			: {
					kind: "Reflexive",
					governedCase: complement.governedCase,
					preposition: complement.preposition.canonicalForm,
				};
	if (complement.kind === "Clause")
		return complement.preposition === undefined
			? { kind: "Clause", form: complement.form }
			: {
					kind: "Clause",
					form: complement.form,
					preposition: complement.preposition.canonicalForm,
				};
	return complement;
}

/** Writes a Dumrel German ValencyPattern in the notation. */
export function printStoredGermanPattern(
	pattern: Dumrel.ValencyPattern,
	context: PatternContext,
): string {
	return printGermanPattern(
		pattern.map((complement) =>
			proposedComplementOf(complement as Dumrel.GermanValencyComplement),
		),
		context,
	);
}

/** Sort rank of a German complement within a canonicalized concrete pattern. */
function complementOrderKey(
	complement: Dumrel.GermanValencyComplement,
): string {
	switch (complement.kind) {
		case "Case": {
			const rank =
				complement.governedCase === "Nom"
					? "0"
					: complement.governedCase === "Dat"
						? "2"
						: complement.governedCase === "Acc"
							? "3"
							: "4";
			return `${rank}:${complement.governedCase}`;
		}
		case "Reflexive":
			return `1:${complement.preposition?.canonicalForm ?? ""}:${complement.governedCase}`;
		case "Preposition":
			return `5:${complement.preposition.canonicalForm}:${complement.governedCase}`;
		case "Adverbial":
			return `6:${complement.standIn}`;
		case "Predicative":
			return `7:${complement.marker}`;
		case "Clause":
			return `8:${complement.preposition?.canonicalForm ?? ""}:${complement.form}`;
	}
}

/**
 * Orders a concrete German pattern canonically (`Nom`, `Reflexive`, `Dat`,
 * `Acc`, `Gen`, `Preposition`s, `Adverbial`, `Predicative`, `Clause`) so two
 * occurrences realizing the same complement set deduplicate cleanly.
 */
export function canonicalizeGermanPattern(
	pattern: readonly Dumrel.GermanValencyComplement[],
): Dumrel.GermanValencyComplement[] {
	return [...pattern].sort((left, right) =>
		complementOrderKey(left).localeCompare(complementOrderKey(right)),
	);
}

/** Canonical identity key for comparing two German ValencyPatterns regardless of order. */
export function germanPatternKey(pattern: Dumrel.ValencyPattern): string {
	const canonical = canonicalizeGermanPattern(
		pattern as readonly Dumrel.GermanValencyComplement[],
	);
	return canonicalJson(canonical.map(proposedComplementOf));
}

/**
 * The notation as one regular expression, for a strict JSON schema's
 * `pattern`: exactly the concrete patterns `parseGermanPattern` reads. Each
 * preposition a governor selects stands only before the letters of the cases
 * it governs there (or before a Clause head as its `da(r)-` correlate).
 */
export const germanPatternRegex = (() => {
	const any = (options: readonly string[]) => `(?:${options.join("|")})`;
	const byCases = new Map<string, string[]>();
	for (const [preposition, cases] of governedCases) {
		const letters = cases.map((name) => caseLetter[name]);
		const key = letters.length === 1 ? letters.join("") : any(letters);
		byCases.set(key, [...(byCases.get(key) ?? []), preposition]);
	}
	const refl = "(?:sich\\(A\\)|sich\\(D\\))";
	const clause = "(?:dass|ob|w|zu\\+Inf|Inf)";
	const comp = [
		"(?:N|A|D|G)",
		...[...byCases].map(
			([letters, prepositions]) => `${any(prepositions)} ${letters}`,
		),
		refl,
		`${any(fixedPhrasePrepositions)} ${refl}`,
		clause,
		`${any([...governedCases.keys()])} ${clause}`,
		"irgendwo",
		"irgendwohin",
		"irgendwie(?: lange| viel)?",
		"(?:(?:als|für) )?ADJ",
	].join("|");
	return `^(?:-|(?:es )?(?:${comp})(?: (?:${comp}))*)$`;
})();
