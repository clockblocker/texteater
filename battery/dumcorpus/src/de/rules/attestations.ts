import type { Rule } from "../../corpus-types.js";
import { everyMultiword, lexeme } from "./routes.js";

/** What an Attestation of a unit records: its Lemma, Surface and members. */
export const attestations: Rule[] = [
	{
		id: "de/core-features-are-identity",
		statement:
			"Each route splits the Feature Pool between Core Features, which are the Lemma's identity, and its Surfaces' inflection, choosing for the learner. A pillar has one Lemma per cell and a stem word is one Lemma whose forms are Surfaces: mir is a Lemma of its own, diesem a Surface of dieser. A value a learner's dictionary gives only as a usage line under one headword, such as where an adposition stands, is not identity. A value that is neither Core nor inflection leaves the pool and is restated in another layer: Attestation evidence, Reading Knowledge or a dumspec table.",
		adrs: ["ADR-0002", "ADR-0032", "ADR-0034", "ADR-0044"],
		routes: [],
		records: [
			"de/das-rote-band-lag-auf-dem-geschenk",
			"de/der-dritte-band-ist-laengst-vergriffen",
			"de/die-band-spielt-heute-im-kellerclub",
			"de/das-schloss-an-der-tuer-klemmt",
			"de/das-schloss-ueber-dem-fluss-wurde-renoviert",
			"de/die-mutter-passt-nicht-auf-diese-schraube",
			"de/meine-mutter-ruft-jeden-sonntag-an",
			"de/der-kiefer-schmerzte-nach-der-operation",
			"de/die-alte-kiefer-steht-am-hang",
			"de/der-leiter-der-werkstatt-kam-spaeter",
			"de/die-leiter-wackelte-auf-dem-nassen-boden",
			"de/auf-der-karte-sind-drei-seen-eingezeichnet",
			"de/der-faehrmann-hat-uns-uebergesetzt",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/der-laster-fuhr-das-schild-um",
			"de/sie-umfuhr-die-baustelle-weitraeumig",
			"de/bitte-folgen-sie-ihrem-ansprechpartner",
			"de/der-autor-dessen-buch-fehlt-wartet-draussen",
			"de/die-zeugin-deren-aussage-zaehlt-bleibt-anonym",
			"de/er-vergass-seinen-schluessel-im-buero",
			"de/mit-keinem-wort-erwaehnte-sie-den-plan",
			"de/nach-manchem-fehler-lernt-man-schneller",
			"de/viele-kamen-zu-spaet",
			"de/wer-war-das",
			"de/wer-mitkommen-will-meldet-sich-bis-freitag",
			"de/wegen-des-sturms-blieb-die-faehre-im-hafen",
			"de/des-dichten-nebels-wegen-fiel-der-flug-aus",
		],
	},
	{
		id: "de/open-referent",
		statement:
			"A pronoun form whose cells only its referent tells apart attests the cell its sentence settles, through an antecedent, the verb's agreement, address or capitalization: ihm for Anna's Bruder is the dative of er. When the sentence leaves the referent open, it attests the form's Syncretism, never a guessed cell: ihm with no one named is er's or es's.",
		adrs: ["ADR-0044", "ADR-0046"],
		routes: lexeme("PRON"),
		records: [
			"de/ihr-bruder-zieht-um-anna-hilft-ihm-beim-umzug",
			"de/das-tier-zittert-wir-geben-ihm-wasser",
			"de/vergeblich-frage-ich-mich-was-mit-ihm-geschehen-wird",
			"de/sie-legt-das-handy-auf-den-tisch-und-hoert-ihm-aufmerksam-zu",
			"de/sie-gingen-die-vorderreihe-entlang-und-spazierten-durch-den",
			"de/ihnen-kann-es-keiner-recht-machen-und-am-wenigsten-die",
		],
	},
	{
		// Duden https://www.duden.de/rechtschreibung/all ("allein stehend":
		// alles in Ordnung, trotz allem, alles (jedes Ding) hat zwei Seiten)
		// and DWDS https://www.dwds.de/wb/alle, read 2026-10-03.
		id: "de/standalone-alles-means-everything",
		statement:
			"Standing alone, the neuter singular of alle (alles, allem) means 'everything', the use Duden and DWDS list as allein stehend: alles in Ordnung, trotz allem, mit allem einverstanden. It is a fixed use with its own gender, not a pronoun waiting for a referent, so it attests its Neut cell even when the sentence names nothing, and never a Syncretism of alle's singular cells (de/open-referent does not apply).",
		adrs: ["ADR-0044", "ADR-0046"],
		routes: lexeme("PRON"),
		records: [
			"de/mit-allem-bin-ich-einverstanden",
			"de/alles-funktioniert",
			"de/ich-habe-alles-geprueft",
			"de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art",
		],
	},
	{
		id: "de/canonical-form-is-the-headword",
		statement:
			"A Lemma's Canonical Form is its dictionary headword, whatever the sentence spells: Duden's recommended spelling, a noun bare, an interjection in pieces as written (ha ha, o je). Identity ignores case, but the Canonical Form keeps the dictionary's casing (Haus, LOL, Sie), not the word's position: sentence-initial Wegen is wegen. An open slot is … (U+2026) with a space on each side (um … willen). A stem PRON or DET cites its Nom.Masc.Sg cell or, plural-cited, its Nom.Plur (mancher, alle), but viel and wenig their usual bare form. A Surface spelled Canonical need not be the Grundform.",
		adrs: ["ADR-0002", "ADR-0032", "ADR-0035"],
		routes: [],
		records: [
			"de/die-linke-hand-zitterte",
			"de/die-angestellten-streikten-gestern",
			"de/wir-danken-den-angestellten-fuer-ihre-hilfe",
			"de/die-reisenden-steigen-am-bahnhof-aus",
			"de/auf-dem-bahnsteig-warten-dreizehn-reisende",
			"de/der-reisende-wartete-draussen",
			"de/der-reisende-haendler-wartete-draussen",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/ich-suche-einen-besseren-ansatz",
			"de/unter-falschem-namen-mietete-er-das-zimmer",
			"de/am-naechsten-morgen-war-alles-anders",
			"de/das-rennen-hat-spass-gemacht",
			"de/schwimmen-ist-gesund",
			"de/sein-staendiges-meckern-nervt",
			"de/morgen-fahren-wir-nach-hamburg",
			"de/herr-keller-betritt-um-sieben-uhr-das-buero-und-gruesst",
			"de/wegen-dem-regen-kamen-wir-zu-spaet",
			"de/guten-tag-ich-habe-einen-termin",
			"de/ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
			"de/genau-da-liegt-der-hase-im-pfeffer",
			"de/auf-die-pointe-antwortete-sie-im-chat-nur-mit-lol",
			"de/er-antwortete-im-chat-nur-mit-lol",
			"de/als-er-die-treppe-hinunterging-wusste-er-dass-ihm-nichts-zu",
			"de/viele-kamen-zu-spaet",
		],
	},
	{
		id: "de/member-orthography",
		statement:
			"Each member records how it is written. Standard covers sentence-initial capitals, casing the word leaves free (lol for LOL) and the spelling of a Variant Surface, whatever its tags; Typo is a real spelling or casing error, a spelling no Variant tag covers; Fused is one piece of a written word that holds several words (m in im, 's in geht's); Shorthand is a standalone shortened word ('ne, z.B., wo for irgendwo). Members stay aligned with the sentence: none is added, dropped or modernized.",
		adrs: ["ADR-0003", "ADR-0035"],
		routes: [],
		records: [
			"de/im-heft-stand-filosofie-statt-philosophie",
			"de/der-hockte-da-im-gruenen-gras",
			"de/er-antwortete-im-chat-nur-mit-lol",
		],
	},
	{
		id: "de/variant-and-historical-status",
		statement:
			"A Surface is spelled Canonical when it has the dictionary's main spelling of its form, and Variant when it has any other spelling of that form that is no mistake; a mistake is a Typo member. Spelling is judged against the same form, never the citation: gingen is Canonical for gehen. A Variant names every tag that applies: Licensed when a current standard accepts it, Historical when only an earlier one did, Regional for a dialect or regional form, Expressive for letters stretched for effect. Historical status marks an archaic form, not old spelling or syntax: ward is Canonical and Archaic.",
		adrs: ["ADR-0041"],
		routes: [],
		records: [
			"de/im-heft-stand-filosofie-statt-philosophie",
			"de/der-hockte-da-im-gruenen-gras",
			"de/die-peitsche-hat-er-mitgebracht",
			"de/einst-ging-er-an-ufers-rand",
			"de/jetzt-schien-die-sonne-gar-zu-sehr",
			"de/im-funkverkehr-meldete-die-pilotin-zwo-kontakte",
			"de/das-regionalwoerterbuch-nennt-nedd-ausdruecklich-eine",
			"de/beim-blick-ins-tal-rief-er-boahhh",
			"de/im-alten-brief-steht-er-muss-morgen-abreisen",
			"de/im-alten-druck-stand-er-sprach-so-leise-dass-ihn-niemand",
			"de/die-stadtpolizei-zuerich-meldet-die-strasse-zum-hauptbahnhof",
			"de/neeee-des-mach-i-ned",
			"de/es-sol-ein-jeglicher-des-auffgelegten-brots-vnnd-speise-zu",
			"de/es-war-gegen-halb-12-uhr-die-badegaeste-mussten-sich-noch-am",
			"de/als-gregor-samsa-eines-morgens-aus-unruhigen-traeumen",
		],
	},
	{
		id: "de/digits-spell-the-numeral",
		statement:
			"A number written in digits is the numeral word it spells, never a Lemma of its own: 12 gives NUM zwölf, its Surface a Licensed Variant spelling. Digits and letters are two ways to write one word. Digits naming a year from 1100 to 1999 spell the year as it is spoken, in hundreds (neunzehnhundertsiebenundachtzig); from 2000 on they spell the cardinal.",
		adrs: ["ADR-0041", "ADR-0002"],
		routes: lexeme("NUM", "ADJ", "ADV"),
		records: [
			"de/es-war-gegen-halb-12-uhr-die-badegaeste-mussten-sich-noch-am",
			"de/das-trikot-traegt-die-nummer-73",
			"de/auf-der-anzeigetafel-steht-7",
			"de/die-gleichung-lautet-drei-plus-vier-gleich-7",
			"de/die-aufnahme-entstand-1987-in-leipzig",
			"de/die-neue-bruecke-wurde-2024-eroeffnet",
			"de/ich-war-bereits-2x-in-dieser-werkstatt",
		],
	},
	{
		id: "de/empty-inflection-is-structural",
		statement:
			"A Surface leaves its inflection empty only for a dictionary citation, or for an invariant use its route leaves unmarked. A noun leaves its case empty and marks its number only as a vocative (Ach, Treibel) or as a bare noun after voll (voll Wasser). An empty inflection or case states that structure; it never stands for uncertainty.",
		adrs: ["ADR-0032"],
		routes: [],
		records: [
			"de/einst-ging-er-an-ufers-rand",
			"de/ach-treibel-sie-sind-ewig-ein-spoetter",
			"de/findest-du-dass-sie-wirklich-eine-gefaehrliche-person-ist",
			"de/aber-wie-es-auch-liegen-mag-marcell-wir-muessen-uns-nun",
		],
	},
	{
		id: "de/suspended-compound-completion",
		statement:
			"A fragment with a trailing hyphen is completed only in a two-part und or oder coordination with a full compound that shares its literal ending: in Ein- und Ausgang, Ein- is completed to Eingang, with Full coverage. The hyphen belongs to the fragment's Segment: Ein- is one Segment.",
		adrs: ["ADR-0003"],
		routes: lexeme("NOUN"),
		records: [
			"de/kinder-und-jugendbuecher-sind-beliebt",
			"de/sie-verkauft-kinder-und-jugendbuecher",
			"de/sie-kauft-ein-kinder-oder-jugendbuch",
			"de/auf-dem-zettel-steht-kinder",
			// A non-breaking hyphen (U+2011) stays in the Segment too.
			"de/der-laden-fuehrt-kinder-und-jugendbuecher",
		],
	},
	{
		id: "de/verbal-surface-is-whole",
		statement:
			"A verbal Surface describes its whole target. Perfect, future, passive and causative belong to the whole verbal unit and stay empty on an auxiliary's own Surface, and tense describes the finite verb only.",
		adrs: ["ADR-0022", "ADR-0026"],
		routes: lexeme("VERB", "AUX"),
		records: [
			"de/der-faehrmann-hat-uns-uebergesetzt",
			"de/sie-wurde-um-geduld-gebeten",
			"de/das-waere-schoen-gewesen",
			"de/das-waere-fast-schief-gewesen",
			"de/die-peitsche-hat-er-mitgebracht",
			"de/verbrannt-ist-alles-ganz-und-gar",
		],
	},
	{
		id: "de/verb-core-features",
		statement:
			"A VERB's hasSepPrefix names only its separable prefix, never a governed preposition or a preposition with its own complement. lexicallyReflexive names the case its lexical reflexive takes, which is fixed per word: sich erinnern is Acc (ich erinnere mich).",
		adrs: ["ADR-0029"],
		routes: lexeme("VERB"),
		records: [
			"de/der-faehrmann-hat-uns-uebergesetzt",
			"de/sie-erinnert-sich-an-den-geruch",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/der-laster-fuhr-das-schild-um",
			"de/sie-umfuhr-die-baustelle-weitraeumig",
			"de/er-versucht-hinauszulaufen",
			"de/wir-liefen-den-fluss-entlang",
			"de/sieh-mal-an-die-kleine-von-nebenan",
		],
	},
	{
		id: "de/partial-coverage",
		statement:
			"An Attestation is Partial only when fixed material is really missing from the sentence and the whole identity is still clear: a noun sharing another noun's article, a verb sharing the auxiliary or finite verb a coordinated verb nearer to it owns, or a Locution or Saying with a fixed word left out or deliberately changed (Rule de/modification-attests-partially). The shared word counts toward the Partial unit's features, not its members: in stieg aus und wieder ein, [ein] einsteigen is Past. A split target, or one with free words between its members, is still Full.",
		adrs: ["ADR-0003", "ADR-0039", "ADR-0041", "ADR-0022"],
		routes: [...lexeme("NOUN", "VERB"), ...everyMultiword],
		records: [
			"de/herr-keller-betritt-um-sieben-uhr-das-buero-und-gruesst",
			"de/sie-hatte-ihren-grossen-strohhut-aufgesetzt-und-ihren",
			"de/er-stieg-aus-und-gleich-wieder-ein",
		],
	},
];
