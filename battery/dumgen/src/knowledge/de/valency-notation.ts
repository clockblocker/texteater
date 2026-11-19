/**
 * The German word table of the valency notation (`../valency-notation.ts`),
 * in case letters: a Valency Frame as Luna proposes it, each preposition its
 * Canonical Form, written as `N (A|(es) dass|(es) ob|(es) w)`, and read
 * back. `germanFramePattern` is the same language as one regular
 * expression, which Luna's answer is held to (a strict schema's `pattern`).
 *
 * - A Case complement is the letter of its case: N (Nom), A (Acc), D (Dat),
 *   G (Gen).
 * - A Preposition complement is the preposition, a space and the letter of
 *   the case it governs: `auf A`, `mit D`, `wegen G`, `an A`, `an D`. A
 *   one-case preposition's case holds, whatever letter follows it.
 * - A Reflexive is `sich(A)` or `sich(D)`, in a fixed phrase after its
 *   preposition (`außer sich(D)`).
 * - A Clause is `dass`, `ob`, `w`, `zu+Inf` or `Inf`, after `es` when it
 *   needs a correlate and `(es)` when it may take one.
 * - An Adverbial is its stand-in: irgendwo, irgendwohin, irgendwie,
 *   `irgendwie lange`, `irgendwie viel`.
 * - A Predicative is `ADJ`, `als ADJ` or `für ADJ`. It describes the object
 *   when the frame has an Acc Case complement and the subject otherwise;
 *   `ADJ(subj)` and `ADJ(obj)` say so against that.
 * - A verb frame with no subject Slot (an expletive es subject) opens with
 *   `es` (`es D irgendwie`); an empty frame is `-`.
 */
import {
	germanAdpositionAllowedCases,
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

/** A complement as Luna proposes it: a preposition is its Canonical Form. */
export type ProposedComplement =
	| { readonly kind: "Case"; readonly governedCase: CaseName }
	| {
			readonly kind: "Preposition";
			readonly preposition: string;
			readonly governedCase: Exclude<CaseName, "Nom">;
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
			readonly of: "Subject" | "Object";
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

/** What decides a frame's defaults: whether its Lemma is a verb, which has a subject. */
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

const markerWord = { Als: "als", Für: "für" } as const;
const predicativeOfMark = { subj: "Subject", obj: "Object" } as const;

/** The cases a German preposition takes before its complement; none when it is no preposition. */
function prepositionCases(word: string): readonly CaseName[] {
	const entry = germanAdpositionEntry({
		family: "Lexeme",
		canonicalForm: word,
	});
	if (entry === null || entry.family !== "Lexeme") return [];
	const before = entry.positions.Prep;
	return before ? before.allowed : germanAdpositionAllowedCases(entry);
}

const reflexivePattern = /^sich\((A|D)\)$/u;
const predicativePattern = /^ADJ(?:\((subj|obj)\))?$/u;
const isHead = (word: string) =>
	caseOfLetter.has(word) ||
	reflexivePattern.test(word) ||
	clauseOfWord.has(word) ||
	predicativePattern.test(word);

const germanWords: FrameWords = {
	isPrefix: (word) =>
		word === "es" ||
		word === "als" ||
		prepositionCases(word.toLocaleLowerCase("de")).length > 0,
	headLength: (words, index) => {
		const word = words[index];
		if (word === undefined) return 0;
		const pair = `${word} ${words[index + 1] ?? ""}`;
		if (adverbialOfWords.has(pair)) return 2;
		if (adverbialOfWords.has(word)) return 1;
		return isHead(word) ? 1 : 0;
	},
	isOpener: (word) => word === "es",
	combines: (prefix, head) =>
		prefix === "es"
			? clauseOfWord.has(head)
			: prefix === "als"
				? head.startsWith("ADJ")
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

const markerOfPrefix: Readonly<Record<string, "Als" | "Für">> = {
	als: "Als",
	für: "Für",
};

function predicativeOf(
	{ head, prefix }: RawComplement,
	mark: "subj" | "obj" | undefined,
	accusativeObject: boolean,
): Read {
	const marker = prefix === undefined ? "None" : markerOfPrefix[prefix];
	if (marker === undefined) return `«${prefix} ${head}» is no predicative`;
	const plain = accusativeObject ? "Object" : "Subject";
	return {
		kind: "Predicative",
		of: mark === undefined ? plain : predicativeOfMark[mark],
		marker,
	};
}

function reflexiveOf(
	{ head, prefix }: RawComplement,
	governedCase: "Acc" | "Dat",
): Read {
	if (prefix === undefined) return { kind: "Reflexive", governedCase };
	if (prefix === "es" || prefix === "als")
		return `«${prefix} ${head}» is no reflexive`;
	return {
		kind: "Reflexive",
		governedCase,
		preposition: prefix.toLocaleLowerCase("de"),
	};
}

/** A Case complement, or a Preposition one when a preposition stands before its letter. */
function caseComplementOf(
	{ head, prefix }: RawComplement,
	written: CaseName,
): Read {
	if (prefix === undefined) return { kind: "Case", governedCase: written };
	if (prefix === "es" || prefix === "als")
		return `«${prefix} ${head}» is no complement`;
	const preposition = prefix.toLocaleLowerCase("de");
	const cases = prepositionCases(preposition).filter(
		(name): name is Exclude<CaseName, "Nom"> => name !== "Nom",
	);
	const [only] = cases;
	if (cases.length === 1 && only !== undefined)
		return { kind: "Preposition", preposition, governedCase: only };
	if (written === "Nom")
		return `«${prefix} ${head}» names no case ${prefix} governs`;
	return { kind: "Preposition", preposition, governedCase: written };
}

/** One complement as written, or why it is none. */
function complementOf(raw: RawComplement, accusativeObject: boolean): Read {
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
	const predicative = head.match(predicativePattern);
	if (predicative)
		return predicativeOf(
			raw,
			predicative[1] as "subj" | "obj" | undefined,
			accusativeObject,
		);
	const reflexive = head.match(reflexivePattern)?.[1];
	if (reflexive === "A" || reflexive === "D")
		return reflexiveOf(raw, reflexiveCaseOfLetter[reflexive]);
	const written = caseOfLetter.get(head);
	return written === undefined
		? `«${head}» is no complement`
		: caseComplementOf(raw, written);
}

/** Reads a German frame in the notation. */
export function parseGermanFrame(text: string): GermanParse {
	const parsed = parseFrame(text, germanWords);
	if (!parsed.ok) return parsed;
	const { slots } = parsed.frame;
	// The Acc object a predicative's default reads, its own Slot aside.
	const accusative = slots.map(({ alternatives }) =>
		alternatives.some(
			({ head, prefix }) =>
				prefix === undefined && head === caseLetter.Acc,
		),
	);
	const frame: ProposedSlot[] = [];
	for (const [index, slot] of slots.entries()) {
		const accusativeObject = accusative.some(
			(has, other) => has && other !== index,
		);
		const complements: ProposedComplement[] = [];
		for (const raw of slot.alternatives) {
			const read = complementOf(raw, accusativeObject);
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

const isAccusativeCase = (complement: ProposedComplement) =>
	complement.kind === "Case" && complement.governedCase === "Acc";

function rawComplementOf(
	complement: ProposedComplement,
	accusativeObject: boolean,
): RawComplement {
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
		case "Predicative": {
			const plain = accusativeObject ? "Object" : "Subject";
			const head =
				complement.of === plain
					? "ADJ"
					: complement.of === "Subject"
						? "ADJ(subj)"
						: "ADJ(obj)";
			return complement.marker === "None"
				? { head }
				: { prefix: markerWord[complement.marker], head };
		}
	}
}

/** A frame's structure in the notation's German words. */
function rawFrameOf(
	frame: readonly ProposedSlot[],
	context: FrameContext,
): RawFrame {
	const [first] = frame;
	const subjectless =
		context.verb &&
		first !== undefined &&
		!first.complements.some(
			(complement) =>
				complement.kind === "Case" && complement.governedCase === "Nom",
		);
	return {
		...(subjectless ? { opener: "es" } : {}),
		slots: frame.map((slot, index) => {
			const accusativeObject = frame.some(
				(other, at) =>
					at !== index && other.complements.some(isAccusativeCase),
			);
			return {
				optional: slot.status === "Optional",
				alternatives: slot.complements.map((complement) =>
					rawComplementOf(complement, accusativeObject),
				),
			};
		}),
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
 * The prepositions a fixed phrase's Reflexive may follow (`außer sich`):
 * the governable ones and the few only a fixed phrase takes. A grammar
 * letting any word stand there had Luna fill it with runaway letters
 * (`ankommenaluunniit… sich(dat)`, the bench's first round).
 */
const fixedPhrasePrepositions = [
	...germanGovernablePrepositions,
	"außer",
	"hinter",
	"neben",
	"ohne",
];

/**
 * The notation as one regular expression, for a strict JSON schema's
 * `pattern`: the frames `parseGermanFrame` reads, a Preposition
 * complement's preposition one a governor selects. It is the valency
 * notation bench's `letters@r4` pattern (`lab/evaluation/valency-notation/`,
 * its git history), under which Luna matched gold on 74.7% of 193 dev
 * Readings, referents ignored, and never answered unreadable.
 */
export const germanFramePattern = (() => {
	const any = (options: readonly string[]) => `(?:${options.join("|")})`;
	const refl = "(?:sich\\(A\\)|sich\\(D\\))";
	const clause = "(?:dass|ob|w|zu\\+Inf|Inf)";
	const comp = [
		"(?:N|A|D|G)",
		`${any(germanGovernablePrepositions)} (?:A|D|G)`,
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
