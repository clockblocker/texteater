/**
 * Round 1's worked examples and targeted rules (2026-11-19), aimed at
 * production's dev miss clusters: a sich without 🪞 written as a Reflexive,
 * subject and object referents, prepositional Slots written Required, and
 * Locutions that drop a complement their dictionary entry names or add one
 * it does not. Each example is a Reading as `reading` shows it, its frame,
 * and a note on why, which Luna never writes. No Lemma is a gold or
 * spot-check Lemma (`disjoint.ts`).
 */

export type Example = {
	readonly lemma: string;
	readonly family: "Lexeme" | "Locution";
	readonly kind: "VERB" | "ADJ" | "NOUN";
	readonly emoji: string;
	readonly frame: string;
	readonly note?: string;
};

export const r1Examples: readonly Example[] = [
	// Verbs: subject referent.
	{
		lemma: "lügen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🤥",
		frame: "jmd.",
		note: "only a person lies",
	},
	{
		lemma: "stören",
		family: "Lexeme",
		kind: "VERB",
		emoji: "😤",
		frame: "jmd./etw. jmdn./etw.",
		note: "der Lärm stört, er stört; den Unterricht, die Nachbarn",
	},
	{
		lemma: "aufhören",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🛑",
		frame: "jmd./etw. (mit etw.|(es) zu+Inf)",
		note: "der Regen hört auf; damit aufhören, zu …",
	},
	{
		lemma: "entlassen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "📤👔",
		frame: "jmd./etw. jmdn. (aus etw.)",
		note: "die Firma entlässt; only people are dismissed",
	},
	{
		lemma: "verdunsten",
		family: "Lexeme",
		kind: "VERB",
		emoji: "💧☁",
		frame: "etw.",
		note: "no person evaporates",
	},
	{
		lemma: "bestehen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🧱",
		frame: "etw. aus jmdm./etw.",
		note: "consist of: without aus it means something else",
	},
	// Verbs: objects and their referents.
	{
		lemma: "lesen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "📖",
		frame: "jmd. (etw.)",
		note: "er liest gern: the object can go",
	},
	{
		lemma: "behaupten",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🗣❗",
		frame: "jmd./etw. etw.|dass|zu+Inf",
		note: "die Studie behauptet; what is claimed is never a person",
	},
	{
		lemma: "kämmen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪮",
		frame: "jmd. jmdn./etw.",
		note: "no 🪞: in «sie kämmt sich» the sich is the ordinary object",
	},
	{
		lemma: "warnen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "⚠",
		frame: "jmd./etw. (jmdn.) (vor jmdm./etw.|(es) dass)",
		note: "das Schild warnt vor dem Hund",
	},
	// Verbs: reflexives.
	{
		lemma: "beschweren",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪞😠",
		frame: "jmd. sich(akk) (bei jmdm.) (über jmdn./etw.|(es) dass)",
		note: "ich beschwere mich: Acc; both prepositions can go",
	},
	{
		lemma: "kümmern",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪞🫶",
		frame: "jmd. sich(akk) um jmdn./etw.",
		note: "without um it is incomplete",
	},
	{
		lemma: "vornehmen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪞📝",
		frame: "jmd. sich(dat) etw.|zu+Inf",
		note: "ich nehme mir etwas vor: Dat",
	},
	// Verbs: clauses, adverbials, predicatives, expletive es.
	{
		lemma: "ahnen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🤔",
		frame: "jmd. (etw.|(es) dass|(es) ob|(es) w)",
	},
	{
		lemma: "freuen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪞😊",
		frame: "jmd. sich(akk) (auf jmdn./etw.|über jmdn./etw.|(es) dass|(es) zu+Inf)",
	},
	{
		lemma: "hoffen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🌅",
		frame: "jmd. (auf jmdn./etw.|(es) dass|(es) zu+Inf)",
	},
	{
		lemma: "dürfen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🆗",
		frame: "jmd./etw. Inf",
		note: "a modal verb takes a bare infinitive",
	},
	{
		lemma: "wohnen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🏠",
		frame: "jmd. irgendwo",
	},
	{
		lemma: "benehmen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🪞🎩",
		frame: "jmd. sich(akk) irgendwie",
	},
	{
		lemma: "halten",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🤔⚖",
		frame: "jmd. jmdn./etw. für ADJ",
	},
	{
		lemma: "fehlen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "🕳",
		frame: "es jmdm. an etw.(dat)",
		note: "the subject is only an expletive es",
	},
	// Locutions.
	{
		lemma: "Kritik üben",
		family: "Locution",
		kind: "VERB",
		emoji: "🗣👎",
		frame: "jmd./etw. (an jmdm./etw.)",
		note: "die Partei übt Kritik; the target can go",
	},
	{
		lemma: "Wert legen",
		family: "Locution",
		kind: "VERB",
		emoji: "💎",
		frame: "jmd./etw. auf jmdn./etw.|(es) dass",
		note: "without auf it is incomplete",
	},
	{
		lemma: "ins Gespräch kommen",
		family: "Locution",
		kind: "VERB",
		emoji: "💬",
		frame: "jmd. (mit jmdm.)",
		note: "the dictionary names mit jemandem; it can go",
	},
	{
		lemma: "Bescheid geben",
		family: "Locution",
		kind: "VERB",
		emoji: "ℹ",
		frame: "jmd. (jmdm.) (über jmdn./etw.)",
	},
	{
		lemma: "die Leviten lesen",
		family: "Locution",
		kind: "VERB",
		emoji: "📜😠",
		frame: "jmd. jmdm.",
		note: "the fixed noun is no object; whom is required",
	},
	{
		lemma: "in Kauf nehmen",
		family: "Locution",
		kind: "VERB",
		emoji: "🤷💸",
		frame: "jmd. etw.|(es) dass",
		note: "only things and facts are put up with",
	},
	{
		lemma: "unter die Arme greifen",
		family: "Locution",
		kind: "VERB",
		emoji: "🤝",
		frame: "jmd./etw. jmdm.",
		note: "der Staat greift den Firmen unter die Arme",
	},
	{
		lemma: "ins Gewicht fallen",
		family: "Locution",
		kind: "VERB",
		emoji: "⚖",
		frame: "etw.",
		note: "only things weigh in",
	},
	{
		lemma: "ins Gras beißen",
		family: "Locution",
		kind: "VERB",
		emoji: "⚰",
		frame: "jmd.",
		note: "the fixed phrase is no complement",
	},
	{
		lemma: "einen Ruck geben",
		family: "Locution",
		kind: "VERB",
		emoji: "🪞💪",
		frame: "jmd. sich(dat)",
	},
	{
		lemma: "den Braten riechen",
		family: "Locution",
		kind: "VERB",
		emoji: "👃🕵",
		frame: "jmd.",
	},
	// Adjectives and nouns.
	{
		lemma: "neidisch",
		family: "Lexeme",
		kind: "ADJ",
		emoji: "😒",
		frame: "(auf jmdn./etw.)",
	},
	{
		lemma: "dankbar",
		family: "Lexeme",
		kind: "ADJ",
		emoji: "🙏",
		frame: "(jmdm.) (für etw.)",
	},
	{
		lemma: "froh",
		family: "Lexeme",
		kind: "ADJ",
		emoji: "😊",
		frame: "(über jmdn./etw.|(es) dass)",
	},
	{
		lemma: "Hoffnung",
		family: "Lexeme",
		kind: "NOUN",
		emoji: "🌅",
		frame: "(auf etw.(akk)|(es) dass)",
	},
	{
		lemma: "Fenster",
		family: "Lexeme",
		kind: "NOUN",
		emoji: "🪟",
		frame: "-",
	},
];

/** The examples as lines, each a Reading as `reading` names it, its frame, and why. */
export const r1ExampleLines = (examples: readonly Example[] = r1Examples) =>
	examples.map(
		({ lemma, family, kind, emoji, frame, note }) =>
			`«${lemma}» ${family} ${kind} ${emoji} → ${frame}${note ? `   (${note})` : ""}`,
	);

/** The examples block: a heading line, then one line per example. */
export const r1ExamplesBlock = [
	"Examples, each a Reading, then → and the frame you would answer; the note in parentheses says why and is never part of an answer:",
	...r1ExampleLines(),
].join("\n");

/** Round 1's targeted rules, added to production's paragraphs. */
export const r1Rules = [
	"Without 🪞 at the start of the Emoji Description, never write a Required sich(akk) or sich(dat): a sich this sentence shows is then the ordinary object, jmdn./etw. or jmdm./etw. («sie kämmt sich»: jmd. jmdn./etw.).",
	"Most prepositional Slots are Optional: one is Required only when the word without it is ungrammatical or means something else («bestehen aus», «sich kümmern um»). A Locution's prepositional Slot is almost always Optional («Kritik üben»: jmd./etw. (an jmdm./etw.)).",
	"A Locution's frame is its dictionary entry's: each jemand, jemandem or etwas the entry names beyond the Locution's own words is a Slot («jemandem die Leviten lesen»: jmd. jmdm.; «mit jemandem ins Gespräch kommen»: jmd. (mit jmdm.)), Optional when the expression is complete without it; a complement the entry does not name is no Slot.",
	"Choose each referent from who or what fills the complement in this meaning, not in this sentence: jmd. or jmdn. only when it needs a person, etw. only when no person can fill it, jmd./etw. or jmdn./etw. when people and things fill it alike. About half of all simple verbs take a jmd./etw. subject («der Lärm stört»).",
];
