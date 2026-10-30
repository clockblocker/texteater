import type { ManyReadingAdverb, OneReadingAdverb } from "./wh-adverb-types.js";

// The demonstrative, directional and circling adverbs, which `wh-adverbs.ts`
// builds into Authored Members beside the w-adverbs.

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
export const demonstrativeAdverbs: readonly ManyReadingAdverb[] = [
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
export const directionalDemonstratives: readonly OneReadingAdverb[] = [
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
export const directionalAdverbs: readonly OneReadingAdverb[] = [
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
export const circlingAdverbs: readonly ManyReadingAdverb[] = [
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
