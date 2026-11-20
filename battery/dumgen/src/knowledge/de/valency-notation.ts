/**
 * The German word table of the valency notation (`../valency-notation.ts`),
 * in case letters: a Valency Frame as Luna proposes it, each preposition its
 * Canonical Form, written as `N (A|(es) dass|(es) ob|(es) w)`, and read
 * back. `germanFramePattern` is the same language as one regular
 * expression, which Luna's answer is held to (a strict schema's `pattern`),
 * and `parseGermanFrame` reads exactly the frames it holds.
 *
 * - A Case complement is the letter of its case: N (Nom), A (Acc), D (Dat),
 *   G (Gen).
 * - A Preposition complement is a preposition a governor selects, a space
 *   and the letter of a case the ADP Case Table lets it govern before its
 *   complement: `auf A`, `auf D`, `mit D`, never `mit A`.
 * - A Reflexive is `sich(A)` or `sich(D)`, in a fixed phrase after its
 *   preposition (`außer sich(D)`).
 * - A Clause is `dass`, `ob`, `w`, `zu+Inf` or `Inf`, after `es` when it
 *   needs a correlate and `(es)` when it may take one. The correlate's word
 *   comes from its Slot (Dumrel's `clauseCorrelateValues`), so `es` marks
 *   it whatever the word.
 * - An Adverbial is its stand-in: irgendwo, irgendwohin, irgendwie,
 *   `irgendwie lange`, `irgendwie viel`.
 * - A Predicative is `ADJ`, `als ADJ` or `für ADJ`.
 * - A verb frame with no Nom, so no subject (an expletive es subject),
 *   opens with `es` (`es D irgendwie`); an empty frame is `-`. A leading
 *   `es` before a clause alone in its Slot is that opener (`es dass`: *es
 *   heißt, dass …*), since a clause alone takes no correlate.
 */
import {
	germanAdpositionEntry,
	germanGovernablePrepositions,
} from "dumcorpus/inventories";
import {
	type FrameWords,
	parseFrame,
	printFrame,
	type RawComplement,
	type RawFrame,
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
			readonly correlate?: "Required" | "Optional";
	  }
	| {
			readonly kind: "Reflexive";
			readonly governedCase: "Acc" | "Dat";
			readonly preposition?: string;
	  };

export type ProposedSlot = {
	readonly status: "Required" | "Optional";
	readonly complements: readonly ProposedComplement[];
};

/**
 * What decides how a frame is written: whether its Lemma is a verb, whose
 * frame opens with `es` when it has no subject.
 */
export type FrameContext = { readonly verb: boolean };

type GermanParse =
	| { readonly ok: true; readonly frame: ProposedSlot[] }
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
 * Preposition complements the notation writes.
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
 * the governable ones and the few only a fixed phrase takes. A grammar
 * letting any word stand there had Luna fill it with runaway letters
 * (`ankommenaluunniit… sich(dat)`, the bench's first round).
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

const germanWords: FrameWords = {
	isPrefix: (word) =>
		word === "es" ||
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
	combines: (prefix, head, alone) =>
		prefix === "es"
			? clauseOfWord.has(head) && !alone
			: prefix === "als"
				? head === predicative
				: !clauseOfWord.has(head) && !adverbialOfWords.has(head),
	empty: "-",
};

/** A complement read, or why it is none. */
type Read = ProposedComplement | string;

function clauseOf(
	{ head, prefix, optionalPrefix }: RawComplement,
	form: keyof typeof clauseWord,
): Read {
	if (prefix === undefined) return { kind: "Clause", form };
	if (prefix !== "es") return `«${prefix} ${head}» is no clause`;
	return {
		kind: "Clause",
		form,
		correlate: optionalPrefix ? "Optional" : "Required",
	};
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
	const { head, prefix, optionalPrefix } = raw;
	const clause = clauseOfWord.get(head);
	if (clause !== undefined) return clauseOf(raw, clause);
	if (optionalPrefix)
		return `Only a correlate is optional: «(${prefix}) ${head}»`;
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
 * Reads a German frame in the notation: exactly the frames
 * `germanFramePattern` holds, as the Slots they write. A leading `es` says
 * only that the frame has no subject, which its Slots already show.
 */
export function parseGermanFrame(text: string): GermanParse {
	const parsed = parseFrame(text, germanWords);
	if (!parsed.ok) return parsed;
	const frame: ProposedSlot[] = [];
	for (const slot of parsed.frame.slots) {
		const complements: ProposedComplement[] = [];
		for (const raw of slot.alternatives) {
			const read = complementOf(raw);
			if (typeof read === "string") return { ok: false, error: read };
			complements.push(read);
		}
		frame.push({
			status: slot.optional ? "Optional" : "Required",
			complements,
		});
	}
	return { ok: true, frame };
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
				...(complement.correlate === undefined
					? {}
					: {
							prefix: "es",
							...(complement.correlate === "Optional"
								? { optionalPrefix: true }
								: {}),
						}),
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
 * A frame's structure in the notation's German words: a verb's frame with
 * no Nom in any Slot has no subject, and opens with `es`.
 */
function rawFrameOf(
	frame: readonly ProposedSlot[],
	context: FrameContext,
): RawFrame {
	const subjectless =
		context.verb &&
		frame.length > 0 &&
		!frame.some(({ complements }) =>
			complements.some(
				(complement) =>
					complement.kind === "Case" &&
					complement.governedCase === "Nom",
			),
		);
	return {
		...(subjectless ? { opener: "es" } : {}),
		slots: frame.map((slot) => ({
			optional: slot.status === "Optional",
			alternatives: slot.complements.map(rawComplementOf),
		})),
	};
}

/** Writes a German frame in the notation. */
export function printGermanFrame(
	frame: readonly ProposedSlot[],
	context: FrameContext,
): string {
	return printFrame(rawFrameOf(frame, context), germanWords);
}

/**
 * The notation as one regular expression, for a strict JSON schema's
 * `pattern`: the frames `parseGermanFrame` reads. Each preposition a
 * governor selects stands only before the letters of the cases it governs
 * there, the prepositions grouped by those cases (`(?:an|auf|…) (?:A|D)`,
 * `(?:aus|bei|…) D`). Otherwise it is the valency notation bench's
 * `letters@r4` pattern (`lab/evaluation/valency-notation/`, its git
 * history), under which Luna matched gold on 74.7% of 193 dev Readings,
 * referents ignored, and never answered unreadable.
 */
export const germanFramePattern = (() => {
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
		`es ${clause}`,
		`\\(es\\) ${clause}`,
		"irgendwo",
		"irgendwohin",
		"irgendwie(?: lange| viel)?",
		"(?:(?:als|für) )?ADJ",
	].join("|");
	const alts = `(?:${comp})(?:\\|(?:${comp}))*`;
	const slot = `(?:\\(${alts}\\)|${alts})`;
	return `^(?:-|(?:es )?${slot}(?: ${slot})*)$`;
})();
