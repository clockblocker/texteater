import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import type { SplitAdverbParts } from "./pronominal-adverbs.js";

type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
/**
 * The series of a Reading: interrogative, relative, indefinite, negative or
 * demonstrative. Its marker leads the Emoji Description, and no Core feature
 * carries it (system ADR 0029).
 */
type Use = "Int" | "Rel" | "Ind" | "Neg" | "Dem";

/** One Reading of a w-adverb's use: its definition and glosses. */
type Meaning = {
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
/**
 * The head and tail a directional adverb splits into, with words between
 * them (Wo kommst du her? Da gehe ich hin; Rule de/split-adverb-is-one-target).
 */
type Split = Omit<SplitAdverbParts, "form">;
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
	readonly split?: Split;
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

/** An adverb with a single use and one Reading. */
type OneReadingAdverb = Meaning & {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
	readonly split?: Split;
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

/** An adverb with one Reading or several, each under its own emoji. */
type ManyReadingAdverb = Pick<OneReadingAdverb, "text" | "ipa" | "split"> & {
	readonly readings: readonly EmojiMeaning[];
};

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

// da, hier and dort point at a place, dann and damals at a time, and so at a
// manner or degree: the demonstratives that answer wo, wann and wie, so each
// Reading is the w-word's emoji with no marker, as on the da(r)- and hier-
// pronominal adverbs (📍, 🕰, 🔧). da also names a point in time (von da an).
// daher names a starting point (🛫, like woher) and a reason, 'that's why'
// (🤔, like warum), as causal darum does. Each Reading is one the gold names
// or the user ruled; conditional dann (wenn …, dann) is not authored yet.
// https://www.dwds.de/wb/da
// https://www.dwds.de/wb/hier
// https://www.dwds.de/wb/dort
// https://www.dwds.de/wb/dann
// https://www.dwds.de/wb/damals
// https://www.dwds.de/wb/so
// https://www.duden.de/rechtschreibung/daher
const demonstrativeAdverbs: readonly ManyReadingAdverb[] = [
	{
		text: "da",
		ipa: "daː",
		readings: [
			{
				emoji: "📍",
				definition:
					"Bezeichnet einen Ort, auf den man zeigt oder der genannt ist, an dieser oder jener Stelle: Da steht der Hausmeister. Da drüben liegt es.",
				en: ["there; here"],
				ru: ["там; тут; вот"],
			},
			{
				emoji: "🕰",
				definition:
					"Bezeichnet einen genannten oder gemeinten Zeitpunkt, zu dieser Zeit, in diesem Augenblick: Da ward ihm sein Gewehr zu schwer. Von da an war alles anders.",
				en: ["then; at that moment"],
				ru: ["тогда; в тот момент"],
			},
		],
	},
	{
		text: "hier",
		ipa: "hiːɐ̯",
		readings: [
			{
				emoji: "📍",
				definition:
					"Bezeichnet den Ort, an dem der Sprecher ist oder auf den er zeigt, an dieser Stelle: Bitte warten Sie hier. Hier steht er.",
				en: ["here"],
				ru: ["здесь; тут"],
			},
		],
	},
	{
		text: "dort",
		ipa: "dɔʁt",
		readings: [
			{
				emoji: "📍",
				definition:
					"Bezeichnet einen Ort, der vom Sprecher entfernt ist oder genannt wurde, an jener Stelle: Dort drüben steht das Haus. Wir waren gestern dort.",
				en: ["there; over there"],
				ru: ["там"],
			},
		],
	},
	{
		text: "dann",
		ipa: "dan",
		readings: [
			{
				emoji: "🕰",
				definition:
					"Bezeichnet, was in einer Abfolge als Nächstes kommt, danach, darauf: Erst lese ich, dann gehen wir spazieren.",
				en: ["then; after that"],
				ru: ["потом; затем"],
			},
		],
	},
	{
		text: "damals",
		ipa: "ˈdaːmaːls",
		readings: [
			{
				emoji: "🕰",
				definition:
					"Bezeichnet eine vergangene Zeit, von der die Rede ist, zu jener Zeit: Damals wohnten wir noch in Köln. Ich kannte sie schon damals.",
				en: ["then; at that time; back then"],
				ru: ["тогда; в то время"],
			},
		],
	},
	{
		text: "daher",
		ipa: "daˈheːɐ̯",
		split: { head: "da", tail: "her" },
		readings: [
			{
				emoji: "🛫",
				definition:
					"Bezeichnet als Herkunft oder Ausgangspunkt einen genannten oder gezeigten Ort: Daher kommt er. Da komme ich her.",
				en: ["from there"],
				ru: ["оттуда"],
			},
			{
				emoji: "🤔",
				definition:
					"Bezeichnet den Grund, der sich aus dem Vorigen ergibt, aus diesem Grund, deshalb: Er war krank und konnte daher nicht kommen.",
				en: ["that's why; hence; therefore"],
				ru: ["поэтому; отсюда"],
			},
		],
	},
	{
		text: "so",
		ipa: "zoː",
		readings: [
			{
				emoji: "🔧",
				definition:
					"Bezeichnet eine Art und Weise oder einen Grad, auf die man zeigt oder die der Zusammenhang nennt, auf diese Weise, in diesem Maß: Vielleicht ist es so. Der Hund tut mir so leid.",
				en: ["so; like this, that way"],
				ru: ["так; настолько"],
			},
		],
	},
];

// dahin, daher, hierhin, hierher, dorthin and dorther answer wohin and woher,
// and da and hier split from hin or her the same way (Da gehe ich hin, Hier
// kommst du her; Rule de/split-adverb-is-one-target). They are demonstrative
// ADVs, not pronominal adverbs: hin and her are no prepositions. Each has its
// directional Reading only, but daher, with causal daher too, is authored
// with the demonstratives above.
// https://www.duden.de/rechtschreibung/dahin
// https://www.duden.de/rechtschreibung/daher
// https://www.duden.de/rechtschreibung/hierhin
// https://www.duden.de/rechtschreibung/hierher
// https://www.duden.de/rechtschreibung/dorthin
// https://www.duden.de/rechtschreibung/dorther
const directionalDemonstratives: readonly OneReadingAdverb[] = [
	{
		text: "dahin",
		ipa: "daˈhɪn",
		split: { head: "da", tail: "hin" },
		emoji: "🛬",
		definition:
			"Bezeichnet als Ziel einer Bewegung einen genannten oder gezeigten Ort: Wir fahren dahin. Da gehe ich morgen hin.",
		en: ["there (direction); to that place"],
		ru: ["туда"],
	},
	{
		text: "hierhin",
		ipa: "ˈhiːɐ̯hɪn",
		split: { head: "hier", tail: "hin" },
		emoji: "🛬",
		definition:
			"Bezeichnet als Ziel einer Bewegung den Ort, an dem der Sprecher ist oder auf den er zeigt: Stell die Kiste hierhin. Hier kommt der Schrank hin.",
		en: ["here (direction); to this place"],
		ru: ["сюда"],
	},
	{
		text: "hierher",
		ipa: "ˈhiːɐ̯heːɐ̯",
		split: { head: "hier", tail: "her" },
		emoji: "🛫",
		definition:
			"Bezeichnet eine Bewegung zum Sprecher hin, an den Ort, an dem er ist: Komm hierher. Hier kommst du her.",
		en: ["here (towards the speaker); this way"],
		ru: ["сюда (ко мне)"],
	},
	{
		text: "dorthin",
		ipa: "ˈdɔʁthɪn",
		emoji: "🛬",
		definition:
			"Bezeichnet als Ziel einer Bewegung einen entfernten oder genannten Ort, nach dort: Wir fahren morgen dorthin. Stell die Leiter dorthin.",
		en: ["there (direction); to that place"],
		ru: ["туда"],
	},
	{
		text: "dorther",
		ipa: "ˈdɔʁtheːɐ̯",
		emoji: "🛫",
		definition:
			"Bezeichnet als Herkunft oder Ausgangspunkt einen entfernten oder genannten Ort, von dort: Dorther kommt der Wind.",
		en: ["from there"],
		ru: ["оттуда"],
	},
];

// The her- and hin- adverbs are plain directional ADVs with no series marker:
// her- moves towards the speaker or viewpoint, hin- away from it. Colloquial
// raus, rein, rüber, runter and rauf neutralize each pair, and ran shortens
// heran alone (hinan is an elevated word for hinauf). An r- word is no Lemma
// or spelling of its own but the Shorthand member of the word the direction
// picks (Rule de/r-adverb-is-her-or-hin-shorthand): no spelling table lists
// it, and `germanAdverbShorthands` (adverb-shorthands.ts) maps it to the
// words it may stand for. Each has its directional Reading only. rum shortens
// herum, which has no hin- partner and two Readings, so it is authored on its
// own below (`circlingAdverbs`).
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

// herum has no hin- partner (there is no hinum), and its her- does not mean
// towards the speaker, so it is no directional pair word. A free herum has two
// Readings: 🔄 around (Duden senses 1 and 2: circling, a side turned outwards
// or forwards, lying round a centre) and ⌛ over (sense 6, colloquial: die
// Woche ist rum), told apart as noch's ⏳ and ➕ are. Senses 3 to 5 are not
// this ADV: after um, herum belongs to the Locution ADP um … herum
// (adposition-cases.ts), and in the verbal bracket it is the particle of a
// herum- particle verb (Rule de/bracket-particle-or-circumposition). rum is
// its Shorthand (Rule de/r-adverb-is-her-or-hin-shorthand).
// https://www.duden.de/rechtschreibung/herum
// https://www.duden.de/rechtschreibung/rum
const circlingAdverbs: readonly ManyReadingAdverb[] = [
	{
		text: "herum",
		ipa: "hɛˈʁʊm",
		readings: [
			{
				emoji: "🔄",
				definition:
					"Bezeichnet eine Bewegung im Kreis oder eine Lage rings um einen Mittelpunkt, auch, welche Seite nach außen oder vorn zeigt: im Kreis herum; links herum; Du hast den Pullover verkehrt herum an. Nicht nach „um“ (um den Platz herum) und nicht als Verbzusatz (herumlaufen). Umgangssprachlich kurz rum.",
				en: ["around, round"],
				ru: ["вокруг; по кругу"],
			},
			{
				emoji: "⌛",
				definition:
					"Umgangssprachlich: vorüber, vergangen, von einer Zeitspanne, meist mit „sein“: Die Ferien sind fast wieder herum. Die Woche ist rum. Nie räumlich und nicht als Verbzusatz (die Zeit herumkriegen). Umgangssprachlich kurz rum.",
				en: ["over, past (of a stretch of time)"],
				ru: ["прошёл; закончился (о времени)"],
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
