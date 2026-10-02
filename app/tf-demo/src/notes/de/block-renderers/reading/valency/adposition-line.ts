import type * as Dumrel from "dumrel/types";
import {
	type GermanAdpositionCases,
	type GermanAdpositionPosition,
	germanAdpositionEntry,
} from "dumspec/inventories";

type AdpositionLemma = {
	readonly family: string;
	readonly canonicalForm: string;
};

/** German case names as a learner's dictionary prints them. */
const CASE_LABEL = {
	Acc: "Akk",
	Dat: "Dat",
	Gen: "Gen",
} as const satisfies Record<Dumrel.GovernedCase, string>;

/** Acc answers wohin?, Dat answers wo? */
const TWO_WAY_QUESTION = {
	Acc: "wohin?",
	Dat: "wo?",
} as const satisfies Partial<Record<Dumrel.GovernedCase, string>>;

const COLLOQUIAL = "umgangssprachlich";
const THING_TOKEN = "etw";
const POSITION_ORDER = ["Prep", "Post"] as const;

/** One piece of a German ADP Valency Line, in reading order. */
export type AdpositionLinePart =
	| { readonly part: "Word"; readonly text: string }
	| { readonly part: "Token"; readonly text: string };

/** One case the adposition takes, with its gloss: `Akk: wohin?`, `Dat: umgangssprachlich`. */
type AdpositionCaseNote = {
	readonly label: string;
	readonly gloss: string | null;
};

export type AdpositionLine = {
	readonly parts: readonly AdpositionLinePart[];
	readonly cases: readonly AdpositionCaseNote[];
};

/**
 * The German ADP Valency Lines, rendered from dumspec's ADP Case Table
 * rather than a stored frame: `` auf `etw` · Akk: wohin? · Dat: wo? ``,
 * `` um `etw` willen · Gen ``. The Lemma records no position, so a Lexeme
 * ADP gets one line per position the table lists, the preposition first:
 * `` wegen `etw` · Gen · Dat: umgangssprachlich `` and `` `etw` wegen · Gen ``.
 * The complement token stands where the complement goes: after a
 * preposition, before a postposition, inside a circumposition. Empty when
 * the table does not list the adposition.
 */
export function germanAdpositionLines(
	lemma: AdpositionLemma,
): readonly AdpositionLine[] {
	const entry = germanAdpositionEntry(lemma);
	if (!entry) return [];
	if (entry.family === "Locution")
		return [
			{
				parts: locutionParts(lemma.canonicalForm),
				cases: caseNotes(entry.cases),
			},
		];
	return POSITION_ORDER.flatMap((position) => {
		const cases = entry.positions[position];
		return cases
			? [
					{
						parts: lexemeParts(lemma.canonicalForm, position),
						cases: caseNotes(cases),
					},
				]
			: [];
	});
}

/**
 * The mark a Source Context of this adposition carries: the case its
 * complement took (`Dat`), marked colloquial when every position that
 * allows it prefers another case (`Dat · umgangssprachlich`).
 */
export function germanRealizedCaseMark(
	lemma: AdpositionLemma,
	realizedCase: Dumrel.GovernedCase,
): string {
	const entry = germanAdpositionEntry(lemma);
	const caseSets = !entry
		? []
		: entry.family === "Locution"
			? [entry.cases]
			: Object.values(entry.positions);
	const allowing = caseSets.filter(({ allowed }) =>
		allowed.includes(realizedCase),
	);
	const colloquial =
		allowing.length > 0 &&
		allowing.every(
			({ preferred }) => preferred !== null && preferred !== realizedCase,
		);
	const label = CASE_LABEL[realizedCase];
	return colloquial ? `${label} · ${COLLOQUIAL}` : label;
}

function caseNotes(cases: GermanAdpositionCases): AdpositionCaseNote[] {
	const ordered = cases.preferred
		? [
				cases.preferred,
				...cases.allowed.filter(
					(grammaticalCase) => grammaticalCase !== cases.preferred,
				),
			]
		: cases.allowed;
	return ordered.map((grammaticalCase) => ({
		label: CASE_LABEL[grammaticalCase],
		gloss: cases.twoWay
			? (TWO_WAY_QUESTION[
					grammaticalCase as keyof typeof TWO_WAY_QUESTION
				] ?? null)
			: cases.preferred && grammaticalCase !== cases.preferred
				? COLLOQUIAL
				: null,
	}));
}

const THING = { part: "Token", text: THING_TOKEN } as const;

function lexemeParts(
	canonicalForm: string,
	position: GermanAdpositionPosition,
): readonly AdpositionLinePart[] {
	const word = { part: "Word", text: canonicalForm } as const;
	return position === "Post" ? [THING, word] : [word, THING];
}

/**
 * A circumposition's complement fills its open slot (`um … willen`); a
 * complex preposition's follows it (`im Vergleich zu`).
 */
function locutionParts(canonicalForm: string): readonly AdpositionLinePart[] {
	const [before, after] = canonicalForm.split(/\s*(?:\.\.\.|…)\s*/u);
	if (before && after)
		return [
			{ part: "Word", text: before },
			THING,
			{ part: "Word", text: after },
		];
	return [{ part: "Word", text: canonicalForm }, THING];
}
