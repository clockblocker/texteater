/**
 * Round 4 (2026-11-19): the frame with no referent, each noun phrase named
 * by its case alone, as the learner's valency line already shows it
 * (`jD`, `jN`, `jM`, `jS` whatever the referent). Two notations of the
 * same frame: Duden's person forms used as case words (`jmd. jmdn. jmdm.
 * jmds.`, never `etw.`), and case letters (`N A D G`). The prompt is
 * `rules-noref@r2`'s with the referent paragraph gone and every frame written in
 * the notation. Each answer is read back by rewriting it into production's
 * notation, so production's parser and checks score it, referents ignored
 * (`--ignore-referent`).
 */

import { germanGovernablePrepositions } from "dumcorpus/inventories";
import { shared, valency } from "../../../src/knowledge/de/prompts.js";
import {
	type ProposedSlot,
	parseGermanFrame,
} from "../../../src/knowledge/de/valency-notation.js";
import { valencyExamples } from "../../../src/knowledge/de/valency-prompts.js";
import { r1Rules } from "./r1-examples.js";

/** What a notation writes for each case and each reflexive. */
export type CaseWords = {
	readonly Nom: string;
	readonly Acc: string;
	readonly Dat: string;
	readonly Gen: string;
	readonly sichAcc: string;
	readonly sichDat: string;
	/** A Preposition complement; the preposition, a space, the case's word when absent. */
	readonly prep?: (
		preposition: string,
		governedCase: "Acc" | "Dat" | "Gen",
	) => string;
	/** Between Slots, and between one Slot's alternatives. */
	readonly slotSeparator: string;
	readonly alternativeSeparator: string;
};

export const personWords: CaseWords = {
	Nom: "jmd.",
	Acc: "jmdn.",
	Dat: "jmdm.",
	Gen: "jmds.",
	sichAcc: "sich(akk)",
	sichDat: "sich(dat)",
	slotSeparator: " ",
	alternativeSeparator: "|",
};

export const letterWords: CaseWords = {
	Nom: "N",
	Acc: "A",
	Dat: "D",
	Gen: "G",
	sichAcc: "sich(A)",
	sichDat: "sich(D)",
	slotSeparator: " ",
	alternativeSeparator: "|",
};

const caseName = { Acc: "Akk", Dat: "Dat", Gen: "Gen" } as const;

/**
 * E-VALBU's Satzbauplan codes (grammis's glossary: Ksub, Kakk, Kdat,
 * Kgen, Kprp; `( )` optional, `/` alternatives, ` , ` between Slots),
 * a Kprp's preposition and case written into it, which E-VALBU keeps in
 * a separate field, and production's clause, reflexive, adverbial and
 * predicative words.
 */
export const grammisWords: CaseWords = {
	Nom: "Ksub",
	Acc: "Kakk",
	Dat: "Kdat",
	Gen: "Kgen",
	sichAcc: "sich(Akk)",
	sichDat: "sich(Dat)",
	prep: (preposition, governedCase) =>
		`Kprp(${preposition}+${caseName[governedCase]})`,
	slotSeparator: " , ",
	alternativeSeparator: " / ",
};

const clauseWord = {
	Dass: "dass",
	Ob: "ob",
	W: "w",
	ZuInfinitive: "zu+Inf",
	BareInfinitive: "Inf",
} as const;
const standInWords = {
	Irgendwo: "irgendwo",
	Irgendwohin: "irgendwohin",
	Irgendwie: "irgendwie",
	IrgendwieLange: "irgendwie lange",
	IrgendwieViel: "irgendwie viel",
} as const;

/** A frame in production's notation, written in `words`. */
export function rewriteFrame(
	frame: string,
	verb: boolean,
	words: CaseWords,
): string {
	const read = parseGermanFrame(frame, { verb });
	if (!read.ok) throw Error(`${frame} does not read: ${read.error}`);
	return printCaseFrame(read.frame, verb, words);
}

function printCaseFrame(
	frame: readonly ProposedSlot[],
	verb: boolean,
	words: CaseWords,
): string {
	if (frame.length === 0) return "-";
	const complement = (c: ProposedSlot["complements"][number]): string => {
		switch (c.kind) {
			case "Case":
				return words[c.governedCase];
			case "Preposition":
				return words.prep
					? words.prep(c.preposition, c.governedCase)
					: `${c.preposition} ${words[c.governedCase]}`;
			case "Reflexive": {
				const sich =
					c.governedCase === "Acc" ? words.sichAcc : words.sichDat;
				return c.preposition ? `${c.preposition} ${sich}` : sich;
			}
			case "Clause":
				return `${c.correlate === "Required" ? "es " : c.correlate === "Optional" ? "(es) " : ""}${clauseWord[c.form]}`;
			case "Adverbial":
				return standInWords[c.standIn];
			case "Predicative":
				return `${c.marker === "Als" ? "als " : c.marker === "Für" ? "für " : ""}ADJ`;
		}
	};
	const slots = frame.map((slot) => {
		const alternatives = slot.complements
			.map(complement)
			.join(words.alternativeSeparator);
		return slot.status === "Optional" ? `(${alternatives})` : alternatives;
	});
	const first = frame[0]?.complements[0];
	const subjectless =
		verb && !(first?.kind === "Case" && first.governedCase === "Nom");
	return `${subjectless ? `es${words.slotSeparator}` : ""}${slots.join(words.slotSeparator)}`;
}

/** An answer in `words`, rewritten into production's notation. */
export function toProduction(answer: string, words: CaseWords): string {
	const personOf = { Akk: "jmdn.", Dat: "jmdm.", Gen: "jmds." } as const;
	const unseparated = answer
		.replace(
			/Kprp\(([^+()]+)\+(Akk|Dat|Gen)\)/gu,
			(_, preposition: string, name: keyof typeof personOf) =>
				`${preposition} ${personOf[name]}`,
		)
		.split(words.slotSeparator)
		.join(" ")
		.split(words.alternativeSeparator)
		.join("|");
	const map = new Map<string, string>([
		[words.sichAcc, "sich(akk)"],
		[words.sichDat, "sich(dat)"],
		[words.Nom, "jmd."],
		[words.Acc, "jmdn."],
		[words.Dat, "jmdm."],
		[words.Gen, "jmds."],
	]);
	return unseparated.replace(
		/sich\([A-Za-z]+\)|[^\s|()]+/gu,
		(word) => map.get(word) ?? word,
	);
}

const fixedPhrasePrepositions = [
	...germanGovernablePrepositions,
	"außer",
	"hinter",
	"neben",
	"ohne",
];

/** The notation in `words` as one regular expression, production's pattern's shape. */
export function casePattern(words: CaseWords): string {
	const escaped = (word: string) =>
		word.replace(/[.()+|/]/gu, (c) => `\\${c}`);
	const any = (options: readonly string[]) => `(?:${options.join("|")})`;
	const object = any([words.Acc, words.Dat, words.Gen].map(escaped));
	const prepositions = any(germanGovernablePrepositions);
	const preposition = words.prep
		? `Kprp\\(${prepositions}\\+(?:Akk|Dat|Gen)\\)`
		: `${prepositions} ${object}`;
	const refl = any([words.sichAcc, words.sichDat].map(escaped));
	const clause = "(?:dass|ob|w|zu\\+Inf|Inf)";
	const comp = [
		any([words.Nom, words.Acc, words.Dat, words.Gen].map(escaped)),
		preposition,
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
	const alternatives = `(?:${comp})(?:${escaped(words.alternativeSeparator)}(?:${comp}))*`;
	const slot = `(?:\\(${alternatives}\\)|${alternatives})`;
	const between = escaped(words.slotSeparator);
	return `^(?:-|(?:es${between})?${slot}(?:${between}${slot})*)$`;
}

/** The notation paragraphs and rules in `words`, `rules-noref@r2`'s rules. */
function caseParagraphs(w: CaseWords): string[] {
	// Each frame quoted below is written in production's notation, then in `words`.
	const verb = (frame: string) => rewriteFrame(frame, true, w);
	const part = (frame: string) => rewriteFrame(frame, false, w);
	const style =
		w === personWords
			? "person"
			: w === letterWords
				? "letters"
				: "grammis";
	const shape =
		style === "grammis"
			? "Write the frame as E-VALBU writes a Satzbauplan: the Slots in frame order separated by a space, a comma and a space ( , ), an Optional Slot in parentheses, a Required one bare, and the alternatives of one Slot joined by a space, a slash and a space ( / )."
			: "Write the frame in German dictionary notation, as E-VALBU and Duden write a pattern: the Slots in frame order separated by single spaces, an Optional Slot in parentheses, a Required one bare, and the alternatives of one Slot joined by | with no spaces around it.";
	const cases =
		style === "person"
			? `A Case complement is the dictionary pronoun of its case, whoever or whatever fills it, a person or a thing alike: ${w.Nom} (Nom), ${w.Acc} (Acc), ${w.Dat} (Dat), ${w.Gen} (Gen). Never write etw.: the pronoun names the case.`
			: style === "letters"
				? `A Case complement is the letter of its case, whoever or whatever fills it: ${w.Nom} (Nom), ${w.Acc} (Acc), ${w.Dat} (Dat), ${w.Gen} (Gen).`
				: `A Case complement is E-VALBU's code of its case, whoever or whatever fills it: ${w.Nom} (the Nom subject), ${w.Acc} (Acc), ${w.Dat} (Dat), ${w.Gen} (Gen).`;
	const prepositions =
		style === "grammis"
			? `A Preposition complement is Kprp with the preposition and the case it governs there: ${part("(auf jmdn.)").slice(1, -1)}, ${part("(mit jmdm.)").slice(1, -1)}, ${part("(wegen jmds.)").slice(1, -1)}. A governed über or auf takes Akk and a governed vor or zwischen Dat; a governed an or in takes the case the dictionary gives this meaning («denken an»: Akk; «leiden an»: Dat).`
			: `A Preposition complement is the preposition and the ${style === "letters" ? "letter" : "pronoun"} of the case it governs there: auf ${w.Acc}, mit ${w.Dat}, wegen ${w.Gen}; after a two-way preposition (an, auf, hinter, in, neben, über, unter, vor, zwischen) it names which case: an ${w.Acc}, an ${w.Dat}. A governed über or auf takes Acc (über ${w.Acc}) and a governed vor or zwischen Dat (vor ${w.Dat}); a governed an or in takes the case the dictionary gives this meaning («denken an»: an ${w.Acc}; «leiden an»: an ${w.Dat}).`;
	return [
		shape,
		cases,
		prepositions,
		`A Reflexive complement is ${w.sichAcc} or ${w.sichDat}; inside a fixed phrase it follows the phrase's preposition: außer ${w.sichDat}. Without 🪞 at the start of the Emoji Description, never write a Required ${w.sichAcc} or ${w.sichDat}: a sich this sentence shows is then the ordinary object, ${w.Acc} or ${w.Dat} («sie kämmt sich»: ${verb("jmd. jmdn.")}).`,
		`A Clause is dass, ob, w (an indirect w-question), zu+Inf or Inf (a bare infinitive). es before it marks a Required correlate and (es) an Optional one, whatever word the correlate is (es, or the da- word of the Slot's preposition): ${part("(auf jmdn.|(es) dass)")}.`,
		"An Adverbial is its stand-in: irgendwo (a place), irgendwohin (a direction), irgendwie (a manner), irgendwie lange (a duration), irgendwie viel (an amount).",
		"A Predicative is ADJ, als ADJ or für ADJ, ADJ standing for any predicative adjective or noun; it describes the Acc object when the frame has one, else the subject. Write one only when the dictionary's pattern for this meaning names a predicative.",
		`A verb's frame starts with its subject Slot, ${w.Nom}; a verb whose subject is only an expletive es starts with es instead (${verb("es jmdm. irgendwie")}). Write - when the Reading governs nothing.`,
		`Most prepositional Slots are Optional: one is Required only when the word without it is ungrammatical or means something else («bestehen aus», «sich kümmern um»). A Locution's prepositional Slot is almost always Optional («Kritik üben»: ${verb("jmd. (an jmdm.)")}).`,
		`A Collocation of a verb and a noun («Kritik üben», «Hilfe leisten») takes every complement its noun takes, each as an Optional Slot: the noun's preposition («die Kritik an etwas»: ${part("(an jmdm.)")}) and the person it is for («jemandem Hilfe leisten»: ${part("(jmdm.)")}). An Idiom's frame holds each jemand, jemandem or etwas its dictionary entry names beyond its own words, Optional when the idiom is complete without it («mit jemandem ins Gespräch kommen»: ${verb("jmd. (mit jmdm.)")}), and nothing the entry does not name.`,
		`Use only the complement kinds \`complementKinds\` names. Answer with the frame alone: only the notation's ${style === "person" ? "pronouns" : style === "letters" ? "letters" : "codes"}, prepositions, markers and stand-ins, never the Lemma, its fixed words, its separable prefix, a kind's name or any other word.`,
	];
}

/** Production's worked examples, each frame in `words`. */
function examplesLine(words: CaseWords): string {
	const line = `Examples: ${valencyExamples
		.map(
			({ lemma, emoji, verb, frame }) =>
				`${lemma} ${emoji}: ${rewriteFrame(frame, verb, words)}`,
		)
		.join("; ")}`;
	return line.endsWith(".") ? line : `${line}.`;
}

/** Round 4's prompt in `words`: production's linguistic paragraphs, no referent, the rest in the notation. */
export function casePrompt(words: CaseWords): string {
	if (!r1Rules[0]) throw Error("r1's rules are gone");
	return [
		shared.reading,
		shared.evidence,
		valency.task,
		valency.subject,
		valency.reflexive,
		valency.lesart,
		valency.status,
		valency.alternatives,
		valency.freeMarker,
		valency.preposition,
		valency.route,
		valency.fixed,
		...caseParagraphs(words),
		examplesLine(words),
	].join("\n");
}

/**
 * Round 5's Locution examples, in production's notation (each rewritten
 * into the revision's): a Collocation's Optional complements its sentence
 * seldom shows, a fixed noun that is no object beside an object that is,
 * and a Required preposition for contrast. No Lemma is a gold one.
 */
export const locutionExamples = [
	{ lemma: "Kritik üben", emoji: "🗣👎", frame: "jmd. (an jmdm.)" },
	{ lemma: "Bescheid geben", emoji: "ℹ", frame: "jmd. (jmdm.) (über jmdn.)" },
	{ lemma: "ins Gespräch kommen", emoji: "💬", frame: "jmd. (mit jmdm.)" },
	{
		lemma: "eine Rede halten",
		emoji: "🎤",
		frame: "jmd. (vor jmdm.) (über jmdn.)",
	},
	{ lemma: "einen Korb geben", emoji: "🧺🙅", frame: "jmd. jmdm." },
	{ lemma: "in Kauf nehmen", emoji: "🤷💸", frame: "jmd. jmdn.|(es) dass" },
	{ lemma: "Wert legen", emoji: "💎", frame: "jmd. auf jmdn.|(es) dass" },
	{ lemma: "ins Gras beißen", emoji: "⚰", frame: "jmd." },
] as const;

/** Round 5: round 4's prompt in `words` with the Locution examples added, and optionally the fixed-noun rule in the notation. */
export function locutionPrompt(words: CaseWords, fixedRule: boolean): string {
	const prompt = casePrompt(words);
	const lines = prompt.split("\n");
	const examples = lines.pop() ?? "";
	const more = locutionExamples
		.map(
			({ lemma, emoji, frame }) =>
				`${lemma} ${emoji}: ${rewriteFrame(frame, true, words)}`,
		)
		.join("; ");
	const rule = `A Locution's own noun is never a Slot: write ${words.Acc} or ${words.Dat} only for an object beyond the Locution's words («eine Rede halten»: ${rewriteFrame("jmd. (vor jmdm.) (über jmdn.)", true, words)}, never ${rewriteFrame("jmd. jmdn.", true, words)}; «in Kauf nehmen»: ${rewriteFrame("jmd. jmdn.|(es) dass", true, words)}, the thing put up with).`;
	return [
		...lines,
		...(fixedRule ? [rule] : []),
		`${examples.replace(/\.$/u, "")}; ${more}.`,
	].join("\n");
}
