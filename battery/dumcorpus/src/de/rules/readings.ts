import type { Rule } from "../../corpus-types.js";
import { everyMultiword, lexeme, locution } from "./routes.js";

/** What a Reading's Emoji Description names, and when a Lemma gets another (#877). */
export const readings: Rule[] = [
	{
		id: "de/emoji-description-names-the-meaning",
		statement:
			"A Reading's Emoji Description is one to four emoji naming what the target means in its sentence, so it fits every sentence with that meaning. It shows neither the sentence's scene, participants or objects nor a neighbouring word's meaning, and it repeats no grammar the Lemma or its Surfaces carry: öffnen is 🔓, not a 🪟 taken from Sie öffnete das Fenster, and every personal pronoun is 👈.",
		adrs: ["ADR-0002", "ADR-0031", "ADR-0044"],
		routes: [],
		records: [
			"de/das-fenster-laesst-sich-oeffnen",
			"de/der-laden-hat-heute-erst-um-8-geoeffnet",
			"de/er-vergass-seinen-schluessel-im-buero",
		],
	},
	// #887 ruling 3, decided under the user's delegation (#856): the six
	// translation slips #545 named.
	{
		id: "de/translation-gives-the-equivalent",
		statement:
			"A Reading's translation is the target language's dictionary equivalent, in citation form, of the meaning its Emoji Description names, not the sentence's scene: gut 👍 is хороший, not вкусный. It marks its own governed preposition and slot (mit etwas zu tun haben: have to do with something). A lookalike is a false friend (Paket: посылка, not пакет). A Locution or Saying takes the established expression with its meaning, else a paraphrase, never a calque or lookalike idiom (Licht ins Dunkel bringen: shed light on). An abbreviation takes the usual rendering of what it stands for, never a coinage.",
		adrs: ["ADR-0002", "ADR-0031", "ADR-0055"],
		routes: [],
		records: [
			// Paket comes from an imported case, not a Spec Record.
			"de/das-essen-war-ganz-gut",
			"de/durch-die-akten-wurde-endlich-licht-ins-dunkel-gebracht",
			"de/du-hast-heute-wohl-tomaten-auf-den-augen",
			"de/dipl-ing-mueller-leitet-das-projekt",
		],
	},
	{
		id: "de/distinct-concepts-get-distinct-readings",
		statement:
			"A Lemma's meanings get different Emoji Descriptions, and so different Readings, only when they are different concepts a model would tell apart from the sentence: Mutter is 👩‍👧 'mother' and 🔩 'nut', noch ⏳ 'still' and ➕ 'in addition'. Closely related uses, figurative ones and functional or grammatical shades of one meaning share one description: so of manner and of degree is 🔧. When in doubt, fold. A use whose frame has a Required Reflexive Slot is a Reading of its own, its description starting with 🪞: fürchten 😨 and 🪞😨.",
		adrs: ["ADR-0031", "ADR-0052"],
		routes: [],
		records: [
			"de/die-mutter-passt-nicht-auf-diese-schraube",
			"de/meine-mutter-ruft-jeden-sonntag-an",
			"de/das-war-noch-niemals-geschehen",
			"de/k-wartete-noch-ein-weilchen-sah-von-seinem-kopfkissen-aus",
			"de/der-alte-hund-tut-mir-so-leid",
		],
	},
	{
		id: "de/copula-describes-its-own-part",
		statement:
			"A copula, a light verb or another verb whose complement carries the sentence's meaning describes only its own part: being, staying, becoming, causing or seeming. The complement's meaning belongs to the complement's Lemma and stays out, even as a second emoji: sein in Nach der Reise bin ich müde is 🟰, bleiben ⏳, werden 🔄 and scheinen 👀. 🟰 marks sein alone.",
		adrs: ["ADR-0031"],
		routes: [...lexeme("VERB"), ...locution("VERB")],
		records: [
			"de/nach-der-reise-bin-ich-muede",
			"de/ohne-den-anruf-waeren-sie-laenger-geblieben",
			"de/sie-wird-aerztin",
		],
	},
	{
		id: "de/emoji-description-keeps-polarity-and-scale",
		statement:
			"An Emoji Description keeps its meaning's polarity, direction and scale: a pleasant against an unpleasant feeling, up against down, effort needed against strength had, much against little. It starts from the one emoji that carries the meaning and adds another only to remove a real ambiguity, and it never adds a negation or emphasis sign to an emoji that already shows the state: stark in ein starker Raucher is 📈.",
		adrs: ["ADR-0031"],
		routes: [],
		records: [
			"de/er-ist-ein-starker-raucher",
			"de/sie-war-ein-wenig-muede",
			"de/das-war-allzu-leicht",
		],
	},
	{
		id: "de/existential-es-gibt-reading",
		statement:
			"Existential es gibt or es gab, 'there is', is a Reading of geben of its own, describing existence or availability. It never shares geben's giving Reading, whatever the sentence says is there: es gibt Brot is 🌍.",
		adrs: ["ADR-0022", "ADR-0031"],
		routes: lexeme("VERB"),
		records: [
			"de/es-gibt-brot",
			"de/gibt-es-einen-ausweg",
			"de/es-gab-damals-hoffnung",
			"de/weil-es-dort-noch-moeglichkeiten-gibt",
		],
	},
	{
		id: "de/multiword-unit-describes-its-whole-meaning",
		statement:
			"A Locution or Saying is described by the meaning of the whole unit, not of its words: auf den Arm nehmen is 😜 and den Nagel auf den Kopf treffen 🎯. Its own image stays only when it is transparent.",
		adrs: ["ADR-0031", "ADR-0039"],
		routes: everyMultiword,
		records: [
			"de/du-willst-mich-doch-auf-den-arm-nehmen",
			"de/damit-triffst-du-den-nagel-auf-den-kopf",
		],
	},
];
