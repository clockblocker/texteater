import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
type Use = "Int" | "Rel" | "Ind" | "Dem";

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
				"Fragt nach der Art und Weise, dem Grad oder der Beschaffenheit, und hebt im Ausruf einen hohen Grad hervor: Wie geht das? Wie alt bist du? Wie schön!",
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

/** An adverb with a single use and one Reading. */
type OneReadingAdverb = Meaning & {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
};

// The irgend- adverbs are indefinite w-adverbs with one Reading each. Duden
// defines irgendeinmal as irgendwann einmal, so it stores that one synonym.
// https://www.duden.de/rechtschreibung/irgendwo
const indefiniteAdverbs: readonly OneReadingAdverb[] = [
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

// dahin, daher, hierhin and hierher answer wohin and woher and are split the
// same way (Da gehe ich hin, Hier kommst du her; Rule
// de/split-adverb-is-one-target). They are demonstrative ADVs, not pronominal
// adverbs: hin and her are no prepositions. Each has its directional Reading
// only; causal daher (deshalb) is not authored yet.
// https://www.duden.de/rechtschreibung/dahin
// https://www.duden.de/rechtschreibung/daher
// https://www.duden.de/rechtschreibung/hierhin
// https://www.duden.de/rechtschreibung/hierher
const demonstrativeAdverbs: readonly OneReadingAdverb[] = [
	{
		text: "dahin",
		ipa: "daˈhɪn",
		emoji: "🛬",
		definition:
			"Bezeichnet als Ziel einer Bewegung einen genannten oder gezeigten Ort: Wir fahren dahin. Da gehe ich morgen hin.",
		en: ["there (direction); to that place"],
		ru: ["туда"],
	},
	{
		text: "daher",
		ipa: "daˈheːɐ̯",
		emoji: "🛫",
		definition:
			"Bezeichnet als Herkunft oder Ausgangspunkt einen genannten oder gezeigten Ort: Daher kommt er. Da komme ich her.",
		en: ["from there"],
		ru: ["оттуда"],
	},
	{
		text: "hierhin",
		ipa: "ˈhiːɐ̯hɪn",
		emoji: "🛬",
		definition:
			"Bezeichnet als Ziel einer Bewegung den Ort, an dem der Sprecher ist oder auf den er zeigt: Stell die Kiste hierhin. Hier kommt der Schrank hin.",
		en: ["here (direction); to this place"],
		ru: ["сюда"],
	},
	{
		text: "hierher",
		ipa: "ˈhiːɐ̯heːɐ̯",
		emoji: "🛫",
		definition:
			"Bezeichnet eine Bewegung zum Sprecher hin, an den Ort, an dem er ist: Komm hierher. Hier kommst du her.",
		en: ["here (towards the speaker); this way"],
		ru: ["сюда (ко мне)"],
	},
];

// heraus and hinaus are plain directional ADVs with no pronType: out towards
// the speaker or viewpoint, and out away from it. Colloquial raus neutralizes
// the two; it is no Lemma or spelling of its own but the Shorthand member of
// whichever the direction picks (Rule de/raus-is-heraus-or-hinaus), so no
// spelling table lists it. Each has its directional Reading only.
// https://www.duden.de/rechtschreibung/heraus
// https://www.duden.de/rechtschreibung/hinaus
// https://www.duden.de/rechtschreibung/raus
const directionalAdverbs: readonly OneReadingAdverb[] = [
	{
		text: "heraus",
		ipa: "hɛˈʁaʊ̯s",
		emoji: "🐣",
		definition:
			"Von dort drinnen hierher nach draußen, auf den Sprecher oder Betrachter zu: Heraus aus dem Bett! Der Splitter muss heraus. Umgangssprachlich kurz raus.",
		en: ["out (towards the speaker)"],
		ru: ["наружу (сюда)"],
	},
	{
		text: "hinaus",
		ipa: "hɪˈnaʊ̯s",
		emoji: "🚪🏃",
		definition:
			"Von hier drinnen nach dort draußen, vom Sprecher oder Betrachter weg: Hinaus mit dir! Die Kinder wollen hinaus. Umgangssprachlich kurz raus.",
		en: ["out (away from the speaker)"],
		ru: ["наружу (туда)"],
	},
];

// The da(r)- pronominal adverbs carry no marker either (pronominal-adverbs.ts).
const marker: Readonly<Record<Use, string>> = {
	Int: "❓",
	Rel: "🧩",
	Ind: "❔",
	Dem: "",
};

/**
 * A w-adverb has no comparison forms (ADR 0042); pronType is Core, and null
 * for a directional adverb.
 */
function lemmaOf(text: string, use: Use | null): Lemma {
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
	use: Use | null,
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
			emojiDescription: `${use ? marker[use] : ""}${meaning.emoji}`,
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
 * one Ind Lemma each, the demonstrative dahin, daher, hierhin and hierher,
 * one Dem Lemma each, and the directional heraus and hinaus, one Lemma each
 * with no pronType. The wo(r)- pronominal adverbs are in pronominal-adverbs.ts.
 */
export const whAdverbs: readonly AuthoredMember[] = [
	...(["Int", "Rel"] as const).flatMap((use) =>
		adverbs.flatMap((adverb) => whAdverbReadings(adverb, use)),
	),
	...indefiniteAdverbs.map((adverb) => whAdverb(adverb, "Ind", adverb)),
	...demonstrativeAdverbs.map((adverb) => whAdverb(adverb, "Dem", adverb)),
	...directionalAdverbs.map((adverb) => whAdverb(adverb, null, adverb)),
];
