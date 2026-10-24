import type { Rule } from "../../corpus-types.js";
import { lexeme } from "./routes.js";

export const fusedWords: Rule[] = [
	{
		id: "de/fused-word-pieces",
		statement:
			"A fused word is one Segment per word it holds, and each piece belongs to the unit of the word it stands for: im is i (in) and m (dem). Outside a fixed expression a preposition piece is a single-member ADP unless a word governs it, and an article piece belongs to the Head of its phrase: Ich bin im Wald gives [i] ADP and [m, Wald] NOUN. In a fixed expression both pieces are members. A click on a piece opens its unit. An infinitive's infixed zu is a piece: abzuspannen is ab, zu and spannen. am before a superlative with no noun after it is one Segment, a member of the word whose degree it marks.",
		adrs: ["ADR-0027", "ADR-0035", "ADR-0040", "dumgen/ADR-0004"],
		routes: lexeme("ADP", "NOUN", "ADJ", "ADV"),
		records: [
			"de/ich-bin-im-wald",
			"de/mina-reist-am-liebsten-im-fruehling",
			"de/wer-steht-am-naechsten",
			"de/von-allen-arbeitet-sie-am-sorgfaeltigsten",
			"de/am-naechsten-morgen-war-alles-anders",
			"de/genau-da-liegt-der-hase-im-pfeffer",
			"de/morgenstund-hat-gold-im-mund-sagte-sie-verschlafen",
			"de/wir-gehen-zur-schule",
			"de/das-radio-geht-s-wieder",
			"de/er-wartet-aufs-ende",
			"de/der-streit-eskalierte-bereits-mit-seiner-provokation-goss-er",
			"de/wir-stellen-die-daten-zur-verfuegung",
			"de/er-versucht-hinauszulaufen",
		],
	},
	{
		id: "de/abbreviation-is-one-segment",
		statement:
			"An abbreviation (z.B., usw., Dr.) is one Segment and stands for its whole expansion: the Surface of z.B. is zum Beispiel. A name whose initialism is its usual form (BVG, NATO, ZDF, SPD) stays its own Lemma instead, and its Surface keeps the letters: die BVG gives [die, BVG] PROPN BVG, never Berliner Verkehrsbetriebe. An initial the text never expands is its own Lemma the same way, and a name it ends is another: K. and Josef K. are two PROPN Lemmas.",
		adrs: ["ADR-0035", "ADR-0039", "dumgen/ADR-0004"],
		routes: [],
		records: [
			"de/in-berlin-betreibt-die-bvg-die-u-bahn",
			"de/jemand-musste-josef-k-verleumdet-haben-denn-ohne-dass-er",
			"de/k-wartete-noch-ein-weilchen-sah-von-seinem-kopfkissen-aus",
		],
	},
	{
		id: "de/sign-for-a-word",
		statement:
			"A sign written apart that stands for a word, such as + (plus), % (Prozent), € (Euro) or §, is one ResolvableText Segment, repeated or not (§§), and a single-member SYM target: a number beside it is not a member (80 % gives [%] SYM). An emoji stays OpaqueText, which no click reaches.",
		adrs: ["dumgen/ADR-0004", "ADR-0045"],
		routes: lexeme("SYM"),
		records: [
			// Both + of one sentence are clickable, the one no target names too.
			"de/links-steht-bereits-rechts-ergaenzt-sie-ein-zweites",
			"de/die-anzeige-zeigt-80-ladezustand",
			"de/der-eintritt-kostet-zwoelf",
			"de/die-beiden-verweisen-auf-getrennte-regelungen",
			// The sentence itself calls its emoji unclickable.
			"de/vor-dem-nicht-anklickbaren-emoji-steht-ein",
			// An emoticon is such a sign in several marks (de/one-segment-per-mark).
			"de/sie-beendet-die-nachricht-mit",
		],
	},
	{
		id: "de/one-segment-per-mark",
		statement:
			"Each punctuation mark is a Punctuation Segment of its own unless convention writes several as one: three full stops (...) are one ellipsis, as … is, and ?! is one mark. Any other run is one Segment per mark, so …? is two: in Was zum…? the … stands for the left-out Teufel and the ? ends the question. An emoticon written apart in ASCII marks, such as ;-), :-) or :), is one ResolvableText Segment, a sign that stands for a word (de/sign-for-a-word).",
		adrs: ["dumgen/ADR-0004"],
		routes: [],
		records: [
			// …? was one Segment until 2026-10-02 (#853).
			"de/was-zum-2",
			"de/was-zum",
			"de/er-wechselte-einen-gluecklichen-blick-mit-kai-und-fing-an",
			// ???? is four marks.
			"de/der-beschaedigte-scan-zeigte-im-lesbaren-technischen",
			// The user's ruling (#853, 2026-10-02): "?! is one, the ;-) is
			// one as well". #70, user-confirmed, had made ?! and ... one each.
			"de/sie-beendet-die-nachricht-mit",
		],
	},
];
