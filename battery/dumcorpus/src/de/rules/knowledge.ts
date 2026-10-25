import type { Rule } from "../../corpus-types.js";
import { lexeme, locution } from "./routes.js";

/** What a Reading's Knowledge records: its structural aspects (#884). */
export const knowledge: Rule[] = [
	{
		id: "de/valency-frame-follows-e-valbu",
		statement:
			"A Reading's Valency Frame is its sense's Satzbauplan in E-VALBU, else Duden, less E-VALBU's optional place and time complements, free adjuncts: warten has no place Slot. An adjective's frame has no Nom Slot; the copula owns it: stolz (auf + Acc). A Collocation's frame takes its noun's government: eine Entscheidung treffen (über + Acc). A referent is the dictionary's jemand or etwas for the sense, not the sentence's (sich erinnern an: Either). Each clause form listed is an alternative in its Slot. When either of two complements completes the frame, both are Optional: bitten (Acc) (um + Acc).",
		adrs: ["ADR-0034"],
		routes: [
			...lexeme("VERB", "ADJ", "NOUN"),
			...locution("VERB", "ADJ", "NOUN"),
		],
		records: [
			"de/er-wartet-auf-den-nachtbus",
			"de/sie-erinnert-sich-an-den-geruch",
			"de/sie-wurde-um-geduld-gebeten",
			"de/er-ist-stolz-auf-seinen-sohn",
			"de/die-auf-ihn-abgestimmte-loesung-half-sofort",
			"de/das-rote-band-lag-auf-dem-geschenk",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/es-zog-der-wilde-jaegersmann",
			"de/sie-ist-verheiratet",
			"de/ein-interessierter-leser-fragte-nach",
			"de/verbrannt-ist-alles-ganz-und-gar",
			// A Collocation takes its noun's government (#884 batch 3, R4).
			"de/der-ausschuss-trifft-eine-entscheidung",
		],
	},
	{
		id: "de/adjectival-noun-plural-is-weak",
		statement:
			"An adjective or participle used as a noun for a person stores as its plural the weak form after the definite article, matching its weak citation (de/adjectival-noun-lemma): Angestellte stores Angestellten, as in die Angestellten. The strong form after no article (drei Angestellte) belongs to the same paradigm and is no second plural.",
		adrs: ["ADR-0038", "ADR-0040"],
		routes: lexeme("NOUN"),
		records: ["de/die-angestellten-streikten-gestern"],
	},
	{
		id: "de/conjugation-class-from-praeteritum",
		statement:
			"A VERB Reading stores every conjugation class its Präteritum forms attest in this sense, as Duden or DWDS lists them, each judged on the stem: Strong adds no -te (bitten, bat; sein, war), Weak adds -te or -ete to the unchanged stem (warten, wartete) and Mixed adds -te to a changed stem (verbrennen, verbrannte). A separable verb is judged by its stem (anziehen, zog an). Senses may differ: wiegen 'weigh' wog, 'rock' wiegte.",
		adrs: ["ADR-0038"],
		routes: lexeme("VERB"),
		records: [
			"de/es-zog-der-wilde-jaegersmann",
			"de/er-wartet-auf-den-nachtbus",
			"de/sie-erinnert-sich-an-den-geruch",
			"de/sie-wurde-um-geduld-gebeten",
			"de/er-ist-stolz-auf-seinen-sohn",
			"de/das-rote-band-lag-auf-dem-geschenk",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/verbrannt-ist-alles-ganz-und-gar",
		],
	},
	{
		id: "de/relations-need-a-dictionary",
		statement:
			"A Reading claims a semantic relation only where Duden, DWDS or OpenThesaurus lists it for this sense and it holds for the whole Reading: leidtun 😔 takes bedauern, not bereuen. At most three per relation. A register or regional difference neither demotes nor blocks a synonym (Mama, Mutter). An abwertend or pejorativ label demotes a synonym to a near synonym (Kind, Balg). A synonym needs a listing, not a gloss (eine Entscheidung treffen: etwas entscheiden); a hypernym an explicit Oberbegriff, not a definition's genus nor a catch-all (Mensch, Person, Gegenstand, Werk). No antonym is read off a definition's negation, and a converse (kaufen: verkaufen) is a near antonym only when a dictionary lists it as Gegenteil, never an antonym. A target is any German Lemma, matched by Family, Kind and case-folded Canonical Form.",
		longStatement:
			"It draws the lines between neighbouring relations of Dumrel ADR 0005 that generation and review cross most often, each with the example its ruling settled.",
		adrs: [
			"ADR-0011",
			"ADR-0012",
			"ADR-0020",
			"ADR-0039",
			"dumrel/ADR-0005",
		],
		routes: [],
		records: [
			"de/die-mutter-passt-nicht-auf-diese-schraube",
			"de/meine-mutter-ruft-jeden-sonntag-an",
			"de/der-kiefer-schmerzte-nach-der-operation",
			"de/die-angestellten-streikten-gestern",
			"de/sie-erinnert-sich-an-den-geruch",
			"de/verbrannt-ist-alles-ganz-und-gar",
			"de/guten-tag-ich-habe-einen-termin",
			// OpenThesaurus's catch-all Oberbegriffe Person and Gegenstand, Werk.
			"de/es-zog-der-wilde-jaegersmann",
			"de/das-rote-band-lag-auf-dem-geschenk",
			// The user's batch 3 R3 (a gloss backs no synonym) and the
			// whole-Reading test (leidtun 😔 drops bereuen) on #884.
			"de/tut-mir-leid-das-war-mein-fehler",
			"de/der-ausschuss-trifft-eine-entscheidung",
		],
	},
	// The user's batch 2 rulings Q1 (paraphrase test) and Q2 (head noun) on #884.
	{
		id: "de/participle-source-verb-and-meaning",
		statement:
			"A Participial Adjective's Participle Source is the verb its form comes from. Its meaning is Verbal when a current Duden or DWDS sense of the verb paraphrases the Reading, a Partizip II in the passive (geschlossen: has been closed), a Partizip I in the progressive; Drifted when none does (gelassen 'calm', bekannt). Comparability alone is no drift. The head noun picks the sense the paraphrase tests: the plain one if it is its object (Tür, schließen), the reflexive one if it is the reflexive's subject (verheiratet: sich verheiraten); the Source names the bare verb either way.",
		adrs: ["ADR-0036", "ADR-0052"],
		routes: lexeme("ADJ"),
		records: [
			"de/die-tuer-ist-geschlossen",
			"de/der-brief-ist-schon-geschrieben",
			"de/der-geschriebene-brief-lag-auf-dem-tisch",
			"de/auf-der-karte-sind-drei-seen-eingezeichnet",
			// Partizip I, checked in the progressive.
			"de/der-reisende-haendler-wartete-draussen",
			"de/er-sass-schweigend-am-fenster",
			// The head noun is the subject of the verb's reflexive sense.
			"de/sie-ist-verheiratet",
			"de/die-auf-ihn-abgestimmte-loesung-half-sofort",
			"de/ein-interessierter-leser-fragte-nach",
		],
	},
	// The Source producer ruling on #1241 (judge agreement, 2026-10-23).
	{
		id: "de/formation-names-its-source",
		statement:
			"A single word formed whole from one other word, nothing added and nothing cut into pieces, names that word as its Source, one step back: a conversion (Lauf from laufen, Wurf from werfen, a verbal noun with no suffix such as Ausgang from ausgehen, a verb from a noun), a clipping (Uni from Universität) or an acronym (Kita from Kindertagesstätte). A word with a prefix or suffix is an affixal derivation and has Constituents, no Source (Entspannung: entspannen + -ung), and so has a compound. de/participle-source-verb-and-meaning rules a participle's Source.",
		adrs: ["ADR-0050"],
		routes: lexeme("NOUN", "VERB", "ADJ"),
		records: [
			// A verb converted from a noun, and a noun with no Source.
			"de/er-salzt-den-teig",
			// A noun converted from a verb, and the verb with no Source.
			"de/sie-rufen-laut-doch-niemand-hoert-den-ruf",
			// A verbal noun with no suffix.
			"de/die-aufgabe-ist-schwer",
			// A clipping and an acronym.
			"de/die-kripo-untersucht-die-lok",
		],
	},
	// The user's batch 2 ruling Q3 on #884. A wish (gute Besserung) has no
	// value in Dumrel's set and is decided when one comes up.
	{
		id: "de/formula-role-is-narrow",
		statement:
			"A routine formula's Formula Role names the routine it performs in conversation: guten Morgen is a Greeting. Reaction is only a fixed reply to a trigger (gern geschehen after thanks, keine Ursache), never just any reply. An exclamation of feeling (o wei, na ja) or a sound word (wupp) performs no routine and takes no Formula Role.",
		adrs: ["ADR-0039"],
		routes: [...lexeme("INTJ"), ...locution("INTJ")],
		records: [
			"de/guten-tag-ich-habe-einen-termin",
			"de/herr-keller-betritt-um-sieben-uhr-das-buero-und-gruesst",
			"de/na-ja-ganz-ueberzeugt-bin-ich-nicht",
			"de/die-schoss-das-haeschen-ganz-entzwei",
		],
	},
	// The user's batch 2 ruling Q5 on #884.
	{
		id: "de/measure-noun-plural-is-regular",
		statement:
			"A measure noun stores only its regular plural: Lot stores Lote. The uninflected form after a number (drei Lot, zwei Pfund) is a measure construction, not a second plural, even where Duden or DWDS gives it as the plural of the measure sense.",
		adrs: ["ADR-0038"],
		routes: lexeme("NOUN"),
		records: ["de/er-wog-vielleicht-ein-halbes-lot"],
	},
];
