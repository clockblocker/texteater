import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
type Use = "Int" | "Rel" | "Ind" | "Neg" | "Dem";

/** One Reading of a w-adverb's use: its definition and glosses. */
type Meaning = {
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
/** A Reading of a use that has several, each with its own emoji. */
type EmojiMeaning = Meaning & { readonly emoji: string };
/**
 * One w-adverb with its interrogative and relative use, each a Reading of the
 * one Lemma (system ADR 0029). A use is one Reading under the adverb's emoji,
 * or several Readings with an emoji each.
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

// nie and niemals are the negative time adverbs, one Neg Lemma with one
// Reading each. Their marker is the 🚫 of kein, keiner, niemand and nichts,
// before the ⏰ of wann and irgendwann. Duden defines niemals as nie, so it
// stores that one synonym.
// https://www.duden.de/rechtschreibung/nie
// https://www.duden.de/rechtschreibung/niemals
const negativeAdverbs: readonly OneReadingAdverb[] = [
	{
		text: "nie",
		ipa: "niː",
		emoji: "⏰",
		definition:
			"Verneint eine Aussage für jeden Zeitpunkt, also zu keiner Zeit oder nicht ein einziges Mal: Das vergesse ich nie. Er war noch nie in Paris.",
		en: ["never; not once"],
		ru: ["никогда; ни разу"],
	},
	{
		text: "niemals",
		ipa: "ˈniːmaːls",
		emoji: "⏰",
		synonymOf: "nie",
		definition:
			"Verneint eine Aussage für jeden Zeitpunkt wie „nie“, oft nachdrücklicher: Das hätte ich niemals gedacht. Sie hat ihn niemals besucht.",
		en: ["never; at no time"],
		ru: ["никогда"],
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

// The her- and hin- adverbs are plain directional ADVs with no pronType:
// her- moves towards the speaker or viewpoint, hin- away from it. Colloquial
// raus, rein, rüber, runter and rauf neutralize each pair, and ran shortens
// heran alone (hinan is an elevated word for hinauf). An r- word is no Lemma
// or spelling of its own but the Shorthand member of the word the direction
// picks (Rule de/r-adverb-is-her-or-hin-shorthand), so no spelling table
// lists it. Each has its directional Reading only.
// https://www.duden.de/rechtschreibung/heraus
// https://www.duden.de/rechtschreibung/hinaus
// https://www.duden.de/rechtschreibung/raus
// https://www.duden.de/rechtschreibung/rueber
// https://www.duden.de/rechtschreibung/runter
// https://www.duden.de/rechtschreibung/rauf
// https://www.duden.de/rechtschreibung/ran
// https://www.duden.de/rechtschreibung/hinan
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
	{
		text: "herein",
		ipa: "hɛˈʁaɪ̯n",
		emoji: "🚪🤗",
		definition:
			"Von dort draußen hierher nach drinnen, auf den Sprecher oder Betrachter zu: Herein! Kommen Sie herein. Umgangssprachlich kurz rein.",
		en: ["in (towards the speaker)"],
		ru: ["внутрь (сюда)"],
	},
	{
		text: "hinein",
		ipa: "hɪˈnaɪ̯n",
		emoji: "📥",
		definition:
			"Von hier draußen nach dort drinnen, vom Sprecher oder Betrachter weg: Sie ging ins Haus hinein. Umgangssprachlich kurz rein.",
		en: ["in, into (away from the speaker)"],
		ru: ["внутрь (туда)"],
	},
	{
		text: "herüber",
		ipa: "hɛˈʁyːbɐ",
		emoji: "🌉👋",
		definition:
			"Von dort drüben hierher, auf diese Seite, auf den Sprecher oder Betrachter zu: Komm doch herüber! Umgangssprachlich kurz rüber.",
		en: ["over here, across (towards the speaker)"],
		ru: ["сюда (на эту сторону)"],
	},
	{
		text: "hinüber",
		ipa: "hɪˈnyːbɐ",
		emoji: "🌉🚶",
		definition:
			"Von hier nach dort drüben, auf die andere Seite, vom Sprecher oder Betrachter weg: Wir schwimmen zur Insel hinüber. Umgangssprachlich kurz rüber.",
		en: ["over there, across (away from the speaker)"],
		ru: ["туда (на ту сторону)"],
	},
	{
		text: "herunter",
		ipa: "hɛˈʁʊntɐ",
		emoji: "🪂",
		definition:
			"Von dort oben hierher nach unten, auf den Sprecher oder Betrachter zu: Komm vom Baum herunter! Umgangssprachlich kurz runter.",
		en: ["down (towards the speaker)"],
		ru: ["вниз (сюда)"],
	},
	{
		text: "hinunter",
		ipa: "hɪˈnʊntɐ",
		emoji: "🏂",
		definition:
			"Von hier oben nach dort unten, vom Sprecher oder Betrachter weg: Sie fuhr den Hang hinunter. Umgangssprachlich kurz runter.",
		en: ["down (away from the speaker)"],
		ru: ["вниз (туда)"],
	},
	{
		text: "herauf",
		ipa: "hɛˈʁaʊ̯f",
		emoji: "🧗",
		definition:
			"Von dort unten hierher nach oben, auf den Sprecher oder Betrachter zu: Komm zu uns herauf! Umgangssprachlich kurz rauf.",
		en: ["up (towards the speaker)"],
		ru: ["наверх (сюда)"],
	},
	{
		text: "hinauf",
		ipa: "hɪˈnaʊ̯f",
		emoji: "🪜",
		definition:
			"Von hier unten nach dort oben, vom Sprecher oder Betrachter weg: Sie stiegen auf den Turm hinauf. Umgangssprachlich kurz rauf.",
		en: ["up (away from the speaker)"],
		ru: ["наверх (туда)"],
	},
	{
		text: "heran",
		ipa: "hɛˈʁan",
		emoji: "🧲",
		definition:
			"Bezeichnet eine Bewegung auf einen Bezugspunkt, auf den Sprecher oder auf etwas zu, in dessen Nähe: Komm näher heran! Er fuhr dicht an die Mauer heran. Umgangssprachlich kurz ran.",
		en: ["closer; up to"],
		ru: ["ближе; вплотную (к)"],
	},
];

// The da(r)- pronominal adverbs carry no marker either (pronominal-adverbs.ts).
const marker: Readonly<Record<Use, string>> = {
	Int: "❓",
	Rel: "🧩",
	Ind: "❔",
	Neg: "🚫",
	Dem: "",
};

/**
 * A w-adverb has no comparison forms (ADR 0042). pronType is Core for an
 * indefinite, negative or demonstrative adverb, and null for a directional
 * one and for a w-adverb, whose interrogative and relative uses are Readings
 * of one Lemma.
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
			pronType:
				use === "Ind" || use === "Neg" || use === "Dem" ? use : null,
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
 * wie, warum, wieso, weshalb, weswegen): one Lemma each, with an
 * interrogative and a relative Reading; relative wo has a place and a time
 * Reading. Then the indefinite irgend- adverbs,
 * one Ind Lemma each, the negative nie and niemals, one Neg Lemma each, the
 * demonstrative dahin, daher, hierhin and hierher,
 * one Dem Lemma each, and the directional her- and hin- adverbs (heraus,
 * hinaus, herein, hinein, herüber, hinüber, herunter, hinunter, herauf, hinauf
 * and heran), one Lemma each with no pronType. The wo(r)- pronominal adverbs
 * are in pronominal-adverbs.ts.
 */
export const whAdverbs: readonly AuthoredMember[] = [
	...(["Int", "Rel"] as const).flatMap((use) =>
		adverbs.flatMap((adverb) => whAdverbReadings(adverb, use)),
	),
	...indefiniteAdverbs.map((adverb) => whAdverb(adverb, "Ind", adverb)),
	...negativeAdverbs.map((adverb) => whAdverb(adverb, "Neg", adverb)),
	...demonstrativeAdverbs.map((adverb) => whAdverb(adverb, "Dem", adverb)),
	...directionalAdverbs.map((adverb) => whAdverb(adverb, null, adverb)),
];
