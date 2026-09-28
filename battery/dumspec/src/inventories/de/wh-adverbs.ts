import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
type Use = "Int" | "Rel" | "Ind";

/** One Reading of a w-adverb's use: its definition and glosses. */
type Meaning = {
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
/** A Reading of a use that has several, each with its own emoji. */
type EmojiMeaning = Meaning & { readonly emoji: string };
/**
 * One w-adverb with its interrogative and relative use. A use is one Reading
 * under the adverb's emoji, or several Readings with an emoji each.
 * `synonymOf` names the adverb this one is a synonym of in both uses; only
 * that direct claim is stored, and the rest is projected (ADR 0012).
 */
type WhAdverb = {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
	readonly Int: Meaning | readonly EmojiMeaning[];
	readonly Rel: Meaning | readonly EmojiMeaning[];
};

// Duden lists each of these as an interrogative and a relative adverb. Uses
// that name nothing inside their clause are other Kinds and are not authored
// here: the Rule de/relative-w-adverb-fills-a-slot draws that line, and
// de/relative-wo-place-or-time picks the Reading of relative wo.
const adverbs: readonly WhAdverb[] = [
	{
		text: "wo",
		ipa: "voː",
		emoji: "📍",
		Int: {
			definition:
				"Fragt nach dem Ort, an dem sich etwas befindet oder geschieht.",
			en: ["where"],
			ru: ["где"],
		},
		Rel: [
			{
				emoji: "📍",
				definition:
					"Leitet einen Relativsatz ein und bezeichnet den Ort, auch einen übertragenen, an dem etwas ist oder geschieht: die Stadt, wo sie wohnt; in Fällen, wo das gilt.",
				en: ["where; in which"],
				ru: ["где; в котором"],
			},
			{
				emoji: "⏰",
				definition:
					"Leitet einen Relativsatz ein und bezeichnet den Zeitpunkt, zu dem etwas geschieht, umgangssprachlich: in dem Moment, wo sie ankam.",
				en: ["when; in which"],
				ru: ["когда; в который"],
			},
		],
	},
	{
		text: "wohin",
		ipa: "voˈhɪn",
		emoji: "🛬",
		Int: {
			definition: "Fragt nach dem Ziel oder der Richtung einer Bewegung.",
			en: ["where to"],
			ru: ["куда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein und bezeichnet das Ziel einer Bewegung: der Ort, wohin sie fährt.",
			en: ["where; to which"],
			ru: ["куда"],
		},
	},
	{
		text: "woher",
		ipa: "voˈheːɐ̯",
		emoji: "🛫",
		Int: {
			definition: "Fragt nach der Herkunft oder dem Ausgangspunkt.",
			en: ["where from"],
			ru: ["откуда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein und bezeichnet die Herkunft oder den Ausgangspunkt: die Stadt, woher er kommt.",
			en: ["where from; from which"],
			ru: ["откуда"],
		},
	},
	{
		text: "wann",
		ipa: "van",
		emoji: "⏰",
		Int: {
			definition: "Fragt nach dem Zeitpunkt.",
			en: ["when"],
			ru: ["когда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein, meist ohne Bezugswort, und bezeichnet einen Zeitpunkt: Komm, wann du willst.",
			en: ["whenever; when"],
			ru: ["когда"],
		},
	},
	{
		text: "wie",
		ipa: "viː",
		emoji: "🔧",
		Int: {
			definition:
				"Fragt nach der Art und Weise, dem Grad oder der Beschaffenheit: Wie geht das? Wie alt bist du?",
			en: ["how"],
			ru: ["как"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Art“, „Weise“ oder „Maß“ ein und bezeichnet die Art und Weise: die Art, wie er spricht.",
			en: ["how; the way in which"],
			ru: ["как; каким образом"],
		},
	},
	{
		text: "warum",
		ipa: "vaˈʁʊm",
		emoji: "🤔",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder ohne Bezugswort ein und bezeichnet den Grund: der Grund, warum sie geht.",
			en: ["why; for which"],
			ru: ["почему; по которой причине"],
		},
	},
	{
		text: "wieso",
		ipa: "viˈzoː",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition:
				"Fragt nach dem Grund, oft umgangssprachlich oder erstaunt.",
			en: ["why; how come"],
			ru: ["почему; с чего"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder ohne Bezugswort ein und bezeichnet den Grund, eher umgangssprachlich: der Grund, wieso sie geht.",
			en: ["why; for which"],
			ru: ["почему; по которой причине"],
		},
	},
	{
		text: "weshalb",
		ipa: "vɛsˈhalp",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder nach einem ganzen Satz ein und bezeichnet den Grund: Es regnete, weshalb wir blieben.",
			en: ["why; which is why"],
			ru: ["почему; поэтому"],
		},
	},
	{
		text: "weswegen",
		ipa: "vɛsˈveːɡn̩",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder nach einem ganzen Satz ein und bezeichnet den Grund: Es regnete, weswegen wir blieben.",
			en: ["why; which is why"],
			ru: ["почему; поэтому"],
		},
	},
];

// The irgend- adverbs are indefinite w-adverbs with one Reading each. Duden
// defines irgendeinmal as irgendwann einmal, so it stores that one synonym.
// https://www.duden.de/rechtschreibung/irgendwo
type IndefiniteAdverb = Meaning & {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
};
const indefiniteAdverbs: readonly IndefiniteAdverb[] = [
	{
		text: "irgendwo",
		ipa: "ˈɪʁɡəntˌvoː",
		emoji: "📍",
		definition:
			"Bezeichnet einen beliebigen, nicht näher bestimmten Ort: Der Schlüssel liegt irgendwo im Keller.",
		en: ["somewhere; anywhere"],
		ru: ["где-нибудь; где-то"],
	},
	{
		text: "irgendwohin",
		ipa: "ˈɪʁɡəntvoˌhɪn",
		emoji: "🛬",
		definition:
			"Bezeichnet ein beliebiges, nicht näher bestimmtes Ziel einer Bewegung: Sie wollen irgendwohin ans Meer.",
		en: ["somewhere; anywhere (direction)"],
		ru: ["куда-нибудь; куда-то"],
	},
	{
		text: "irgendwoher",
		ipa: "ˈɪʁɡəntvoˌheːɐ̯",
		emoji: "🛫",
		definition:
			"Bezeichnet eine beliebige, nicht näher bestimmte Herkunft: Irgendwoher kenne ich ihn.",
		en: ["from somewhere; from anywhere"],
		ru: ["откуда-нибудь; откуда-то"],
	},
	{
		text: "irgendwann",
		ipa: "ˈɪʁɡəntˌvan",
		emoji: "⏰",
		definition:
			"Bezeichnet einen beliebigen, nicht näher bestimmten Zeitpunkt: Irgendwann kommt er zurück.",
		en: ["sometime; at some point"],
		ru: ["когда-нибудь; когда-то"],
	},
	{
		text: "irgendeinmal",
		ipa: "ˈɪʁɡəntˌaɪ̯nmaːl",
		emoji: "⏰",
		synonymOf: "irgendwann",
		definition:
			"Bezeichnet einen beliebigen, nicht näher bestimmten Zeitpunkt, selten gebraucht: Besuchen Sie mich irgendeinmal.",
		en: ["sometime; at some point"],
		ru: ["когда-нибудь"],
	},
	{
		text: "irgendwie",
		ipa: "ˈɪʁɡəntˌviː",
		emoji: "🔧",
		definition:
			"Bezeichnet eine beliebige, nicht näher bestimmte Art und Weise, umgangssprachlich auch „in gewisser Weise“: Irgendwie schaffen wir das. Das ist irgendwie seltsam.",
		en: ["somehow; in some way"],
		ru: ["как-нибудь; как-то"],
	},
];

const marker: Readonly<Record<Use, string>> = {
	Int: "❓",
	Rel: "🧩",
	Ind: "❔",
};

/** A w-adverb has no comparison forms (ADR 0042); pronType is Core. */
function lemmaOf(text: string, use: Use): Lemma {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADV",
		canonicalForm: text,
		coreFeatures: {
			comparable: null,
			foreign: null,
			numType: null,
			pronType: use,
		},
	};
}

function whAdverbReadings(
	adverb: WhAdverb,
	use: "Int" | "Rel",
): AuthoredMember[] {
	const meanings = adverb[use];
	return "definition" in meanings
		? [whAdverb(adverb, use, { ...meanings, emoji: adverb.emoji })]
		: meanings.map((meaning) => whAdverb(adverb, use, meaning));
}

function whAdverb(
	adverb: Pick<WhAdverb, "text" | "ipa" | "synonymOf">,
	use: Use,
	meaning: EmojiMeaning,
): AuthoredMember {
	const lemma = lemmaOf(adverb.text, use);
	const synonym = adverb.synonymOf
		? [lemmaOf(adverb.synonymOf, use)]
		: undefined;
	return defineAuthoredMember({
		lemma,
		reading: {
			unitKind: "Reading",
			emojiDescription: `${marker[use]}${meaning.emoji}`,
			lemma,
		},
		knowledge: {
			transcription: adverb.ipa,
			definition: meaning.definition,
			translations: { en: [...meaning.en], ru: [...meaning.ru] },
			...(synonym ? { semanticRelations: { synonym } } : {}),
		},
		coverage: {
			transcription: "Authored",
			definition: "Authored",
			translations: { en: "Authored", ru: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: synonym ? "Authored" : "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		},
	});
}

/**
 * The German interrogative and relative w-adverbs (wo, wohin, woher, wann,
 * wie, warum, wieso, weshalb, weswegen): one Int and one Rel Lemma each,
 * since pronType is Core. Each Lemma has one Reading, except relative wo,
 * which has a place and a time Reading. Then the indefinite irgend- adverbs,
 * one Ind Lemma each. The wo(r)- pronominal adverbs are in
 * pronominal-adverbs.ts.
 */
export const whAdverbs: readonly AuthoredMember[] = [
	...(["Int", "Rel"] as const).flatMap((use) =>
		adverbs.flatMap((adverb) => whAdverbReadings(adverb, use)),
	),
	...indefiniteAdverbs.map((adverb) => whAdverb(adverb, "Ind", adverb)),
];
