import { type GermanAdpositionCase, germanAdpositionCases } from "dumling";

type AdpositionLemma = {
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

/** German case names as a learner's dictionary prints them. */
const CASE_LABEL = {
	Acc: "Akk",
	Dat: "Dat",
	Gen: "Gen",
} as const satisfies Record<GermanAdpositionCase, string>;

/** Acc answers wohin?, Dat answers wo? */
const TWO_WAY_QUESTION = {
	Acc: "wohin?",
	Dat: "wo?",
} as const satisfies Partial<Record<GermanAdpositionCase, string>>;

const COLLOQUIAL = "umgangssprachlich";
const THING_TOKEN = "etw";

/** One piece of a German ADP Valency Line, in reading order. */
export type AdpositionLinePart =
	| { readonly part: "Word"; readonly text: string }
	| { readonly part: "Token"; readonly text: string };

/** One case the adposition takes, with its gloss: `Akk: wohin?`, `Dat: umgangssprachlich`. */
export type AdpositionCaseNote = {
	readonly label: string;
	readonly gloss: string | null;
};

export type AdpositionLine = {
	readonly parts: readonly AdpositionLinePart[];
	readonly cases: readonly AdpositionCaseNote[];
};

/**
 * The German ADP Valency Line, rendered from Dumling's ADP Case Table rather
 * than a stored frame: `` auf `etw` · Akk: wohin? · Dat: wo? ``,
 * `` `etw` entlang · Akk ``, `` wegen `etw` · Gen · Dat: umgangssprachlich ``.
 * The complement token stands where the complement goes: after a
 * preposition, before a postposition, inside a circumposition. `null` when
 * the table does not list the adposition.
 */
export function germanAdpositionLine(
	lemma: AdpositionLemma,
): AdpositionLine | null {
	const adpType = adpTypeOf(lemma.coreFeatures);
	const cases = germanAdpositionCases({
		canonicalForm: lemma.canonicalForm,
		coreFeatures: { adpType },
	});
	if (!cases) return null;
	const ordered = cases.preferred
		? [
				cases.preferred,
				...cases.allowed.filter(
					(grammaticalCase) => grammaticalCase !== cases.preferred,
				),
			]
		: cases.allowed;
	return {
		parts: lineParts(lemma.canonicalForm, adpType),
		cases: ordered.map((grammaticalCase) => ({
			label: CASE_LABEL[grammaticalCase],
			gloss: cases.twoWay
				? (TWO_WAY_QUESTION[
						grammaticalCase as keyof typeof TWO_WAY_QUESTION
					] ?? null)
				: cases.preferred && grammaticalCase !== cases.preferred
					? COLLOQUIAL
					: null,
		})),
	};
}

/**
 * The mark a Source Context of this adposition carries: the case its
 * complement took (`Dat`), marked colloquial when the table prefers another
 * case (`Dat · umgangssprachlich`).
 */
export function germanRealizedCaseMark(
	lemma: AdpositionLemma,
	realizedCase: GermanAdpositionCase,
): string {
	const cases = germanAdpositionCases({
		canonicalForm: lemma.canonicalForm,
		coreFeatures: { adpType: adpTypeOf(lemma.coreFeatures) },
	});
	const label = CASE_LABEL[realizedCase];
	return cases?.preferred && cases.preferred !== realizedCase
		? `${label} · ${COLLOQUIAL}`
		: label;
}

function lineParts(
	canonicalForm: string,
	adpType: string | null,
): readonly AdpositionLinePart[] {
	const token = { part: "Token", text: THING_TOKEN } as const;
	const [before, after] = canonicalForm.split(/\s*(?:\.\.\.|…)\s*/u);
	if (adpType === "Circ" && before && after)
		return [
			{ part: "Word", text: before },
			token,
			{ part: "Word", text: after },
		];
	const word = { part: "Word", text: canonicalForm } as const;
	return adpType === "Post" ? [token, word] : [word, token];
}

function adpTypeOf(coreFeatures: unknown): string | null {
	if (
		typeof coreFeatures !== "object" ||
		coreFeatures === null ||
		!("adpType" in coreFeatures)
	)
		return null;
	return typeof coreFeatures.adpType === "string"
		? coreFeatures.adpType
		: null;
}
