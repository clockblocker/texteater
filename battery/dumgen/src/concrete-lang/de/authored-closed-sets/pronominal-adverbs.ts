import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Core = Dumling.Lemma<"de", "Lexeme", "ADV">["coreFeatures"];

/**
 * One preposition that forms pronominal adverbs. `vowel` inserts the linking r
 * after da and wo (daran, worauf); hier never takes it (hieran).
 */
type Preposition = {
	readonly text: string;
	readonly ipa: string;
	readonly vowel: boolean;
	readonly emoji: string;
	/** English for the demonstrative reading (`it` slot) and the wo forms (`what`/`which` slot). */
	readonly en: { readonly it: readonly string[]; readonly what: string };
	readonly ru: {
		readonly it: readonly string[];
		readonly what: readonly string[];
	};
};

// Duden and IDS list the prepositions that fuse with da(r), hier and wo(r).
// wider and ob fuse only in fixed or archaic forms and are left out.
const prepositions: readonly Preposition[] = [
	{
		text: "an",
		ipa: "ʁan",
		vowel: true,
		emoji: "📌",
		en: { it: ["on it", "about it"], what: "on {}" },
		ru: { it: ["на это", "об этом"], what: ["на что", "о чём"] },
	},
	{
		text: "auf",
		ipa: "ʁaʊ̯f",
		vowel: true,
		emoji: "🔝",
		en: { it: ["on it", "for it"], what: "for {}" },
		ru: { it: ["на это", "на этом"], what: ["на что"] },
	},
	{
		text: "aus",
		ipa: "ʁaʊ̯s",
		vowel: true,
		emoji: "📤",
		en: { it: ["out of it", "from it"], what: "out of {}" },
		ru: { it: ["из этого"], what: ["из чего"] },
	},
	{
		text: "bei",
		ipa: "baɪ̯",
		vowel: false,
		emoji: "🤝",
		en: { it: ["at it", "in doing so"], what: "at {}" },
		ru: { it: ["при этом"], what: ["при чём"] },
	},
	{
		text: "durch",
		ipa: "dʊʁç",
		vowel: false,
		emoji: "🚪",
		en: { it: ["through it", "thereby"], what: "through {}" },
		ru: {
			it: ["через это", "благодаря этому"],
			what: ["через что", "благодаря чему"],
		},
	},
	{
		text: "für",
		ipa: "fyːɐ̯",
		vowel: false,
		emoji: "🎁",
		en: { it: ["for it"], what: "for {}" },
		ru: { it: ["за это", "для этого"], what: ["за что", "для чего"] },
	},
	{
		text: "gegen",
		ipa: "ɡeːɡn̩",
		vowel: false,
		emoji: "🚧",
		en: { it: ["against it"], what: "against {}" },
		ru: { it: ["против этого"], what: ["против чего"] },
	},
	{
		text: "hinter",
		ipa: "hɪntɐ",
		vowel: false,
		emoji: "🔙",
		en: { it: ["behind it"], what: "behind {}" },
		ru: { it: ["за этим"], what: ["за чем"] },
	},
	{
		text: "in",
		ipa: "ʁɪn",
		vowel: true,
		emoji: "📥",
		en: { it: ["in it"], what: "in {}" },
		ru: { it: ["в этом", "в это"], what: ["в чём"] },
	},
	{
		text: "mit",
		ipa: "mɪt",
		vowel: false,
		emoji: "🔗",
		en: { it: ["with it"], what: "with {}" },
		ru: { it: ["с этим", "этим"], what: ["с чем", "чем"] },
	},
	{
		text: "nach",
		ipa: "naːx",
		vowel: false,
		emoji: "🔜",
		en: { it: ["after that", "about it"], what: "after {}" },
		ru: { it: ["после этого", "об этом"], what: ["после чего", "о чём"] },
	},
	{
		text: "neben",
		ipa: "neːbn̩",
		vowel: false,
		emoji: "🧱",
		en: { it: ["next to it"], what: "next to {}" },
		ru: { it: ["рядом с этим"], what: ["рядом с чем"] },
	},
	{
		text: "über",
		ipa: "ʁyːbɐ",
		vowel: true,
		emoji: "🌂",
		en: { it: ["about it", "over it"], what: "about {}" },
		ru: { it: ["об этом", "над этим"], what: ["о чём", "над чем"] },
	},
	{
		text: "um",
		ipa: "ʁʊm",
		vowel: true,
		emoji: "🔄",
		en: { it: ["about it", "around it"], what: "about {}" },
		ru: { it: ["об этом", "вокруг этого"], what: ["о чём"] },
	},
	{
		text: "unter",
		ipa: "ʁʊntɐ",
		vowel: true,
		emoji: "🕳",
		en: { it: ["under it", "by it"], what: "under {}" },
		ru: { it: ["под этим"], what: ["под чем"] },
	},
	{
		text: "von",
		ipa: "fɔn",
		vowel: false,
		emoji: "📨",
		en: { it: ["of it", "from it"], what: "of {}" },
		ru: { it: ["об этом", "от этого"], what: ["о чём", "от чего"] },
	},
	{
		text: "vor",
		ipa: "foːɐ̯",
		vowel: false,
		emoji: "⏳",
		en: { it: ["in front of it", "of it"], what: "in front of {}" },
		ru: { it: ["перед этим", "этого"], what: ["перед чем", "чего"] },
	},
	{
		text: "zu",
		ipa: "tsuː",
		vowel: false,
		emoji: "🎯",
		en: { it: ["to it", "for it"], what: "to {}" },
		ru: { it: ["к этому", "для этого"], what: ["к чему", "для чего"] },
	},
	{
		text: "zwischen",
		ipa: "tsvɪʃn̩",
		vowel: false,
		emoji: "🌉",
		en: { it: ["between them"], what: "between {}" },
		ru: { it: ["между ними"], what: ["между чем"] },
	},
];

type Series = {
	readonly prefix: string;
	readonly linking: boolean;
	readonly ipa: string;
	readonly pronType: NonNullable<Core["pronType"]>;
	readonly marker: string;
	readonly definition: (form: string, preposition: string) => string;
	readonly en: (preposition: Preposition) => readonly string[];
	readonly ru: (preposition: Preposition) => readonly string[];
};
const fill = (pattern: string, word: string) => pattern.replace("{}", word);
const relativeRu: Readonly<Record<string, string>> = {
	что: "которое",
	чего: "которого",
	чему: "которому",
	чем: "которым",
	чём: "котором",
};
const series: readonly Series[] = [
	{
		prefix: "da",
		linking: true,
		ipa: "da",
		pronType: "Dem",
		marker: "",
		definition: (form, preposition) =>
			`„${form}“ ist ein Pronominaladverb aus „da“ und „${preposition}“. Es ersetzt „${preposition} + Sache“ (nicht Person) und verweist auf etwas zuvor Genanntes oder auf einen folgenden Nebensatz.`,
		en: (preposition) => preposition.en.it,
		ru: (preposition) => preposition.ru.it,
	},
	{
		prefix: "hier",
		linking: false,
		ipa: "hiːɐ̯",
		pronType: "Dem",
		marker: "👉",
		definition: (form, preposition) =>
			`„${form}“ ist ein Pronominaladverb aus „hier“ und „${preposition}“. Es ersetzt „${preposition} + Sache“ und verweist auf das eben Genannte oder Vorliegende, meist in formeller Sprache.`,
		en: (preposition) =>
			preposition.en.it.map((text) => `${text} (formal)`),
		ru: (preposition) => preposition.ru.it,
	},
	{
		prefix: "wo",
		linking: true,
		ipa: "vo",
		pronType: "Int",
		marker: "❓",
		definition: (form, preposition) =>
			`„${form}“ ist ein Frageadverb aus „wo“ und „${preposition}“. Es fragt nach „${preposition} + Sache“, nicht nach einer Person.`,
		en: (preposition) => [fill(preposition.en.what, "what")],
		ru: (preposition) => preposition.ru.what,
	},
	{
		prefix: "wo",
		linking: true,
		ipa: "vo",
		pronType: "Rel",
		marker: "🧩",
		definition: (form, preposition) =>
			`„${form}“ ist ein Relativadverb aus „wo“ und „${preposition}“. Es leitet einen Relativsatz ein und ersetzt „${preposition} + Sache“, oft nach „das“, „etwas“, „alles“, „nichts“ oder nach einem ganzen Satz.`,
		en: (preposition) => [fill(preposition.en.what, "which")],
		ru: (preposition) =>
			preposition.ru.what.map((text) =>
				text.replace(/\S+$/u, (word) => relativeRu[word] ?? word),
			),
	},
];

function pronominalAdverb(
	entry: Series,
	preposition: Preposition,
): AuthoredMember {
	const form = `${entry.prefix}${entry.linking && preposition.vowel ? "r" : ""}${preposition.text}`;
	// Without the linking r a vowel-initial preposition starts with a glottal stop.
	const onset =
		preposition.vowel && !entry.linking
			? preposition.ipa.replace(/^ʁ/u, "ʔ")
			: preposition.ipa;
	const ipa = `${entry.ipa}ˈ${onset}`;
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADV",
		canonicalForm: form,
		coreFeatures: {
			foreign: null,
			numType: null,
			pronType: entry.pronType,
		},
	} satisfies Dumling.Lemma<"de", "Lexeme", "ADV">;
	return defineAuthoredMember({
		lemma,
		reading: {
			unitKind: "Reading",
			emojiDescription: `${entry.marker}${preposition.emoji}`,
			lemma,
		},
		knowledge: {
			transcription: ipa,
			definition: entry.definition(form, preposition.text),
			translations: {
				en: [...entry.en(preposition)],
				ru: [...entry.ru(preposition)],
			},
		},
		coverage: {
			transcription: "Authored",
			definition: "Authored",
			translations: { en: "Authored", ru: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		},
	});
}

/**
 * Every German pronominal adverb: da(r)- and hier- forms are demonstrative,
 * wo(r)- forms are one interrogative and one relative Lemma each, since
 * pronType is a Lemma Core Feature. Classification keeps each one a singleton
 * ADV; a verb that governs the fused preposition does not absorb it.
 */
export const pronominalAdverbs: readonly AuthoredMember[] = series.flatMap(
	(entry) =>
		prepositions.map((preposition) => pronominalAdverb(entry, preposition)),
);
