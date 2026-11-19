/**
 * The German word table of the valency notation (`skeleton.ts`), in
 * Duden's style: a Valency Frame as Luna proposes it, each preposition its
 * Canonical Form, written as `jmd. (etw.|(es) dass|(es) ob|(es) w)`, and
 * read back.
 *
 * - A Case or Preposition complement is the dictionary's pronoun, its case
 *   in its form: jmd. jmdn. jmdm. jmds. (Someone, Nom/Acc/Dat/Gen), etw.
 *   (Something), `jmdn./etw.` (Either). A bare etw. is Nom as a verb's
 *   subject (its first Slot) and Acc elsewhere; another case is marked
 *   `etw.(dat)`, `etw.(gen)`. After a preposition of one case, the
 *   preposition's case holds; after a two-way one etw. names it,
 *   `auf etw.(akk)`, `an etw.(dat)`.
 * - A Reflexive is `sich(akk)` or `sich(dat)`, in a fixed phrase after its
 *   preposition (`außer sich(dat)`).
 * - A Clause is `dass`, `ob`, `w`, `zu+Inf` or `Inf`, after `es` when it
 *   needs a correlate and `(es)` when it may take one.
 * - An Adverbial is its stand-in: irgendwo, irgendwohin, irgendwie,
 *   `irgendwie lange`, `irgendwie viel`.
 * - A Predicative is `ADJ`, `als ADJ` or `für ADJ`. It describes the object
 *   when the frame has an Acc Case complement and the subject otherwise;
 *   `ADJ(subj)` and `ADJ(obj)` say so against that.
 * - A verb frame with no subject Slot (an expletive es subject) opens with
 *   `es` (`es jmdm. irgendwie`); an empty frame is `-`.
 */
import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import {
	type FrameWords,
	type ParseOptions,
	parseFrame,
	printFrame,
	type RawComplement,
	type RawFrame,
} from "./skeleton.js";

type Referent = "Someone" | "Something" | "Either";
type CaseName = "Nom" | "Acc" | "Dat" | "Gen";

/** A complement as Luna proposes it: a preposition is its Canonical Form. */
export type ProposedComplement =
	| {
			readonly kind: "Case";
			readonly governedCase: CaseName;
			readonly referent: Referent;
	  }
	| {
			readonly kind: "Preposition";
			readonly preposition: string;
			readonly governedCase: Exclude<CaseName, "Nom">;
			readonly referent: Referent;
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

/** What the reading left to a default, which a prompt may want to name. */
type Leniency = "TwoWayPrepositionCase" | "PrepositionCaseRepaired";

export type GermanParse =
	| {
			readonly ok: true;
			readonly frame: ProposedSlot[];
			readonly lenient: readonly Leniency[];
	  }
	| { readonly ok: false; readonly error: string };

const someoneForm: Readonly<Record<CaseName, string>> = {
	Nom: "jmd.",
	Acc: "jmdn.",
	Dat: "jmdm.",
	Gen: "jmds.",
};
const caseOfSomeone = new Map(
	Object.entries(someoneForm).map(([name, form]) => [form, name as CaseName]),
);
const caseMark: Readonly<Record<CaseName, string>> = {
	Nom: "nom",
	Acc: "akk",
	Dat: "dat",
	Gen: "gen",
};
const caseOfMark = new Map(
	Object.entries(caseMark).map(([name, mark]) => [mark, name as CaseName]),
);

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

const referentPart =
	/^(jmd\.|jmdn\.|jmdm\.|jmds\.|etw\.(?:\((nom|akk|dat|gen)\))?)$/u;
const isReferentWord = (word: string) =>
	word.split("/").every((part) => referentPart.test(part));
const isHead = (word: string) =>
	isReferentWord(word) ||
	word === "sich(akk)" ||
	word === "sich(dat)" ||
	clauseOfWord.has(word) ||
	/^ADJ(\((subj|obj)\))?$/u.test(word);

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

/** A referent word's referent, the case its jmd. form names and the one its etw. marks. */
function readReferent(
	word: string,
): { referent: Referent; named?: CaseName; marked?: CaseName } | string {
	const parts = word.split("/");
	const someone = parts.find((part) => part.startsWith("jmd"));
	const something = parts.find((part) => part.startsWith("etw."));
	if (parts.length > 2 || (parts.length === 2 && !(someone && something)))
		return `«${word}» is no referent`;
	const named =
		someone === undefined ? undefined : caseOfSomeone.get(someone);
	const mark = something?.match(/\((\w+)\)/u)?.[1];
	const marked = mark === undefined ? undefined : caseOfMark.get(mark);
	const referent: Referent =
		someone && something ? "Either" : someone ? "Someone" : "Something";
	return {
		referent,
		...(named === undefined ? {} : { named }),
		...(marked === undefined ? {} : { marked }),
	};
}

/** Where a complement stands, which its defaults read. */
type Position = {
	readonly subject: boolean;
	/** Whether another Slot of the frame holds an Acc Case complement. */
	readonly accusativeObject: boolean;
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
	position: Position,
): Read {
	const marker = prefix === undefined ? "None" : markerOfPrefix[prefix];
	if (marker === undefined) return `«${prefix} ${head}» is no predicative`;
	const plain = position.accusativeObject ? "Object" : "Subject";
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

/**
 * A preposition's complement: a one-case preposition's case holds, a
 * two-way one's is the pronoun's, Acc when a bare etw. names none.
 */
function prepositionOf(
	{ head, prefix }: RawComplement & { readonly prefix: string },
	referent: Referent,
	written: CaseName | undefined,
	lenient: Leniency[],
): Read {
	if (prefix === "es" || prefix === "als")
		return `«${prefix} ${head}» is no complement`;
	const preposition = prefix.toLocaleLowerCase("de");
	const cases = prepositionCases(preposition).filter(
		(name): name is Exclude<CaseName, "Nom"> => name !== "Nom",
	);
	const [only] = cases;
	if (cases.length === 1 && only !== undefined) {
		if (written !== undefined && written !== only)
			lenient.push("PrepositionCaseRepaired");
		return {
			kind: "Preposition",
			preposition,
			governedCase: only,
			referent,
		};
	}
	if (written === undefined) lenient.push("TwoWayPrepositionCase");
	const governedCase = written ?? "Acc";
	if (governedCase === "Nom")
		return `«${prefix} ${head}» names no case ${prefix} governs`;
	return { kind: "Preposition", preposition, governedCase, referent };
}

/** A Case or Preposition complement: its pronoun, after its preposition if any. */
function referenceOf(
	raw: RawComplement,
	position: Position,
	lenient: Leniency[],
): Read {
	const read = readReferent(raw.head);
	if (typeof read === "string") return read;
	const { referent, named, marked } = read;
	if (named !== undefined && marked !== undefined && named !== marked)
		return `«${raw.head}» names two cases`;
	const { prefix } = raw;
	if (prefix === undefined)
		return {
			kind: "Case",
			governedCase: named ?? marked ?? (position.subject ? "Nom" : "Acc"),
			referent,
		};
	return prepositionOf(
		{ ...raw, prefix },
		referent,
		named ?? marked,
		lenient,
	);
}

/** One complement as written, or why it is none. */
function complementOf(
	raw: RawComplement,
	position: Position,
	lenient: Leniency[],
): Read {
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
	const predicative = head.match(/^ADJ(?:\((subj|obj)\))?$/u);
	if (predicative)
		return predicativeOf(
			raw,
			predicative[1] as "subj" | "obj" | undefined,
			position,
		);
	const reflexive = head.match(/^sich\((akk|dat)\)$/u);
	if (reflexive)
		return reflexiveOf(raw, reflexive[1] === "akk" ? "Acc" : "Dat");
	return referenceOf(raw, position, lenient);
}

const isAccusativeCase = (complement: ProposedComplement) =>
	complement.kind === "Case" && complement.governedCase === "Acc";

/** Reads a German frame in the notation, `context` deciding its defaults. */
export function parseGermanFrame(
	text: string,
	context: FrameContext,
	options: ParseOptions = {},
): GermanParse {
	const parsed = parseFrame(text, germanWords, options);
	if (!parsed.ok) return parsed;
	const { opener, slots } = parsed.frame;
	const lenient: Leniency[] = [];
	// The Acc object a predicative's default reads, its own Slot aside; a
	// bare etw. there is Acc unless it is the subject, so read it as such.
	const subjectSlot = context.verb && opener === undefined ? 0 : -1;
	const first: ProposedComplement[][] = [];
	for (const [index, slot] of slots.entries()) {
		const complements: ProposedComplement[] = [];
		for (const raw of slot.alternatives) {
			const read = complementOf(
				raw,
				{ subject: index === subjectSlot, accusativeObject: false },
				[],
			);
			if (typeof read === "string") return { ok: false, error: read };
			complements.push(read);
		}
		first.push(complements);
	}
	const frame: ProposedSlot[] = [];
	for (const [index, slot] of slots.entries()) {
		const accusativeObject = first.some(
			(complements, other) =>
				other !== index && complements.some(isAccusativeCase),
		);
		const complements: ProposedComplement[] = [];
		for (const raw of slot.alternatives) {
			const read = complementOf(
				raw,
				{ subject: index === subjectSlot, accusativeObject },
				lenient,
			);
			if (typeof read === "string") return { ok: false, error: read };
			complements.push(read);
		}
		frame.push({
			status: slot.optional ? "Optional" : "Required",
			complements,
		});
	}
	return { ok: true, frame, lenient };
}

/** The referent word of a Someone, Something or Either in `governedCase`. */
function referentWord(
	referent: Referent,
	governedCase: CaseName,
	etw: string,
): string {
	const someone = someoneForm[governedCase];
	if (referent === "Someone") return someone;
	if (referent === "Something") return etw;
	return `${someone}/etw.`;
}

const markedEtw = (governedCase: CaseName) => `etw.(${caseMark[governedCase]})`;

function rawComplementOf(
	complement: ProposedComplement,
	position: Position,
): RawComplement {
	switch (complement.kind) {
		case "Case": {
			const plain = position.subject ? "Nom" : "Acc";
			const etw =
				complement.governedCase === plain
					? "etw."
					: markedEtw(complement.governedCase);
			return {
				head: referentWord(
					complement.referent,
					complement.governedCase,
					etw,
				),
			};
		}
		case "Preposition": {
			const single =
				prepositionCases(complement.preposition).length === 1;
			const etw = single ? "etw." : markedEtw(complement.governedCase);
			return {
				prefix: complement.preposition,
				head: referentWord(
					complement.referent,
					complement.governedCase,
					etw,
				),
			};
		}
		case "Reflexive":
			return {
				head: `sich(${caseMark[complement.governedCase]})`,
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
			const plain = position.accusativeObject ? "Object" : "Subject";
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
	const subjectSlot = context.verb && !subjectless ? 0 : -1;
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
					rawComplementOf(complement, {
						subject: index === subjectSlot,
						accusativeObject,
					}),
				),
			};
		}),
	};
}

/** Writes a German frame in the notation; with a headword, the headword goes last. */
export function printGermanFrame(
	frame: readonly ProposedSlot[],
	context: FrameContext,
	options: ParseOptions = {},
): string {
	return printFrame(rawFrameOf(frame, context), germanWords, options);
}
