import { type AuthoredMember, textTranslations } from "../member.js";
import type { SplitAdverbParts } from "./pronominal-adverbs.js";
import {
	circlingAdverbs,
	demonstrativeAdverbs,
	directionalAdverbs,
	directionalDemonstratives,
} from "./wh-adverb-places.js";
import type {
	EmojiMeaning,
	Lemma,
	ManyReadingAdverb,
	OneReadingAdverb,
	Use,
	WhAdverb,
} from "./wh-adverb-types.js";

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
				emoji: "🕰",
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
		split: { head: "wo", tail: "hin" },
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
		split: { head: "wo", tail: "her" },
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
		emoji: "🕰",
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
		emoji: "🕰",
		definition:
			"Bezeichnet einen beliebigen, nicht näher bestimmten Zeitpunkt: Irgendwann kommt er zurück.",
		en: ["sometime; at some point"],
		ru: ["когда-нибудь; когда-то"],
	},
	{
		text: "irgendeinmal",
		ipa: "ˈɪʁɡəntˌaɪ̯nmaːl",
		emoji: "🕰",
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

// nie and niemals are the negative time adverbs, nirgends and nirgendwo the
// negative place adverbs, and keineswegs 'by no means' the negative manner
// adverb, one Lemma with one Reading each. Their marker is the 🚫 of kein,
// keiner, niemand and nichts, before the 🕰 of wann and irgendwann, the 📍 of
// wo and irgendwo or the 🔧 of wie and irgendwie. Duden defines niemals as
// nie and nirgendwo as nirgends, so each stores that one synonym.
// https://www.duden.de/rechtschreibung/nie
// https://www.duden.de/rechtschreibung/niemals
// https://www.duden.de/rechtschreibung/nirgends
// https://www.duden.de/rechtschreibung/nirgendwo
// https://www.duden.de/rechtschreibung/keineswegs
const negativeAdverbs: readonly OneReadingAdverb[] = [
	{
		text: "nie",
		ipa: "niː",
		emoji: "🕰",
		definition:
			"Verneint eine Aussage für jeden Zeitpunkt, also zu keiner Zeit oder nicht ein einziges Mal: Das vergesse ich nie. Er war noch nie in Paris.",
		en: ["never; not once"],
		ru: ["никогда; ни разу"],
	},
	{
		text: "niemals",
		ipa: "ˈniːmaːls",
		emoji: "🕰",
		synonymOf: "nie",
		definition:
			"Verneint eine Aussage für jeden Zeitpunkt wie „nie“, oft nachdrücklicher: Das hätte ich niemals gedacht. Sie hat ihn niemals besucht.",
		en: ["never; at no time"],
		ru: ["никогда"],
	},
	{
		text: "nirgends",
		ipa: "ˈnɪʁɡn̩ts",
		emoji: "📍",
		definition:
			"Bezeichnet, dass etwas an keinem Ort, an keiner Stelle ist oder geschieht: Den Schlüssel finde ich nirgends. Nirgends ist es so schön wie hier.",
		en: ["nowhere"],
		ru: ["нигде"],
	},
	{
		text: "nirgendwo",
		ipa: "ˈnɪʁɡn̩tˈvoː",
		emoji: "📍",
		synonymOf: "nirgends",
		definition:
			"Bezeichnet wie „nirgends“, dass etwas an keinem Ort ist oder geschieht: Er fühlt sich nirgendwo zu Hause.",
		en: ["nowhere"],
		ru: ["нигде"],
	},
	{
		text: "keineswegs",
		ipa: "ˈkaɪ̯nəsˈveːks",
		emoji: "🔧",
		definition:
			"Verneint eine Aussage nachdrücklich: durchaus nicht, nicht im Geringsten: Die Reparatur ist keineswegs abgeschlossen.",
		en: ["by no means; not at all"],
		ru: ["отнюдь не; вовсе не; ни в коем случае"],
	},
];

// selbst and selber after or before the word they stress (Ich habe es selbst
// gemacht; Der Chef selbst kam) are ADVs, not determiners or pronouns, with
// the emphatic Reading 🫵. selbst also means 'even' (Selbst der Techniker
// übersah den Riss), its 😮 Reading. selber is the colloquial headword Duden
// defines as emphatic selbst, so it claims selbst as a synonym.
// https://www.duden.de/rechtschreibung/selbst_sogar_auch
// https://www.duden.de/rechtschreibung/selber
const emphaticAdverbs: readonly (ManyReadingAdverb & {
	readonly synonymOf?: string;
})[] = [
	{
		text: "selbst",
		ipa: "zɛlpst",
		readings: [
			{
				emoji: "🫵",
				definition:
					"Hebt nachdrücklich hervor, dass die genannte Person oder Sache gemeint ist und keine andere, oft auch, dass sie ohne fremde Hilfe handelt: Ich habe es selbst gemacht. Der Chef selbst kam zur Feier.",
				en: ["oneself (myself, himself, itself …)", "in person"],
				ru: ["сам; сама; само; сами"],
			},
			{
				emoji: "😮",
				definition:
					"Hebt hervor, dass etwas auch für das Genannte gilt, bei dem man es am wenigsten erwartet, sogar: Selbst der erfahrenste Techniker übersah den Riss.",
				en: ["even"],
				ru: ["даже"],
			},
		],
	},
	{
		text: "selber",
		ipa: "ˈzɛlbɐ",
		synonymOf: "selbst",
		readings: [
			{
				emoji: "🫵",
				definition:
					"Hebt umgangssprachlich wie „selbst“ nachdrücklich hervor, dass die genannte Person oder Sache gemeint ist und keine andere: Das mache ich selber. Du hast es selber gesagt.",
				en: ["oneself (myself, himself, itself …)"],
				ru: ["сам; сама; само; сами"],
			},
		],
	},
];

// The demonstratives carry no marker, as the da(r)- and hier- pronominal
// adverbs carry none (pronominal-adverbs.ts).
const marker: Readonly<Record<Use, string>> = {
	Int: "❓",
	Rel: "🧩",
	Ind: "❔",
	Neg: "🚫",
	Dem: "",
};

/**
 * A w-adverb and its kin have no comparison forms (ADR 0042), and German ADV
 * has no pronType: the series is the Reading's marker, so a w-adverb's
 * interrogative and relative uses are Readings of one Lemma (system ADR 0029).
 */
function lemmaOf(text: string): Lemma {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADV",
		canonicalForm: text,
		coreFeatures: { comparable: null },
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
	const lemma = lemmaOf(adverb.text);
	const synonym = adverb.synonymOf ? [lemmaOf(adverb.synonymOf)] : undefined;
	return {
		lemma,
		reading: {
			unitKind: "Reading",
			emojiDescription: `${use ? marker[use] : ""}${meaning.emoji}`,
			lemma,
		},
		knowledge: {
			transcription: adverb.ipa,
			definition: meaning.definition,
			translations: {
				en: textTranslations(meaning.en),
				ru: textTranslations(meaning.ru),
			},
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
	};
}

/**
 * The German interrogative and relative w-adverbs (wo, wohin, woher, wann,
 * wie, warum, wieso, weshalb, weswegen): one Lemma each, with an
 * interrogative and a relative Reading; relative wo has a place and a time
 * Reading. Then one Lemma each for the indefinite irgend- adverbs, the
 * negative nie, niemals, nirgends, nirgendwo and keineswegs, the
 * demonstrative da, hier, dort, dann, damals, daher and so, the demonstrative
 * dahin, hierhin, hierher, dorthin and dorther, the directional her- and hin-
 * adverbs (heraus, hinaus, herein, hinein, herüber, hinüber, herunter,
 * hinunter, herauf, hinauf and heran), herum with its around and over
 * Readings, and emphatic selbst and selber. Each
 * Reading's marker shows its series.
 * The wo(r)- pronominal adverbs are in pronominal-adverbs.ts.
 */
export const whAdverbs: readonly AuthoredMember[] = [
	...(["Int", "Rel"] as const).flatMap((use) =>
		adverbs.flatMap((adverb) => whAdverbReadings(adverb, use)),
	),
	...indefiniteAdverbs.map((adverb) => whAdverb(adverb, "Ind", adverb)),
	...negativeAdverbs.map((adverb) => whAdverb(adverb, "Neg", adverb)),
	...demonstrativeAdverbs.flatMap((adverb) =>
		adverb.readings.map((meaning) => whAdverb(adverb, "Dem", meaning)),
	),
	...directionalDemonstratives.map((adverb) =>
		whAdverb(adverb, "Dem", adverb),
	),
	...directionalAdverbs.map((adverb) => whAdverb(adverb, null, adverb)),
	...circlingAdverbs.flatMap((adverb) =>
		adverb.readings.map((meaning) => whAdverb(adverb, null, meaning)),
	),
	...emphaticAdverbs.flatMap((adverb) =>
		adverb.readings.map((meaning) => whAdverb(adverb, null, meaning)),
	),
];

/**
 * The parts of each directional adverb that splits (wohin, woher, daher,
 * dahin, hierhin, hierher): Wo kommst du her? is head wo and tail her of
 * woher. dorthin and dorther are not read split.
 */
export const directionalAdverbParts: readonly SplitAdverbParts[] = [
	...adverbs,
	...demonstrativeAdverbs,
	...directionalDemonstratives,
].flatMap(({ text, split }) => (split ? [{ ...split, form: text }] : []));
