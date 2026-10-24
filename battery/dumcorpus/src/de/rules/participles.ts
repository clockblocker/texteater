import type { Rule } from "../../corpus-types.js";
import { lexeme } from "./routes.js";

export const participles: Rule[] = [
	{
		id: "de/verbal-participle",
		statement:
			"A participle is verbal only in a perfect with haben or sein (hat gebacken, ist abgereist) or a passive with werden, bekommen, kriegen or erhalten (wird gebacken). There it joins its auxiliaries in one VERB target: ist … aufgefunden worden includes all three.",
		adrs: ["ADR-0036", "ADR-0022"],
		routes: lexeme("VERB"),
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
		id: "de/sein-perfect-or-copula",
		statement:
			"sein or haben with a participle is a perfect only when the clause reports the verb's own event, and sein only when the verb's perfect takes sein (kommen, werden). The context decides, and a simple past that says the same supports it: ist abgefahren is fuhr ab. Otherwise the participle is an ADJ describing a state and the verb stays apart: copular sein, the state passive included (Das Fenster ist geöffnet gives [ist] VERB and [geöffnet] ADJ; Sie ist verärgert gives verärgert ADJ with no reflexive), or the VERB haben (Der Laden hat bis 20 Uhr geöffnet gives [hat] VERB and [geöffnet] ADJ).",
		adrs: ["ADR-0036"],
		routes: lexeme("VERB", "ADJ"),
		records: [
			"de/der-brief-ist-schon-geschrieben",
			"de/die-kartoffeln-sind-bereits-gekocht",
			"de/die-tuer-ist-geschlossen",
			"de/auf-der-karte-sind-drei-seen-eingezeichnet",
			"de/sie-ist-verheiratet",
			"de/verbrannt-ist-alles-ganz-und-gar",
			"de/der-laden-hat-bis-20-uhr-geoeffnet",
			"de/der-laden-hat-heute-erst-um-8-geoeffnet",
			"de/er-hat-die-ganze-zeit-die-augen-geschlossen",
			"de/er-hat-ploetzlich-die-augen-geschlossen",
			// A verb whose perfect takes haben has no sein perfect: entscheiden
			// and verleiden give copular sein and an ADJ.
			"de/so-ueber-alle-zweifel-war-das-entschieden-dass-er",
			"de/ist-dir-korinna-die-du-vorhin-so-grossmuetig-verteidigen",
		],
	},
	{
		id: "de/participial-adjective",
		statement:
			"A participle outside a perfect or passive is an ADJ, attributive, adverbial or predicative: die gebratenen Zwiebeln. Its own objects, adverbs and agents are free words, and so are its prepositional phrases, except a preposition it governs (de/governed-preposition-joins-its-governor). A substantivized participle or adjective is a NOUN, capitalized and owning its article like any noun (der Reisende). A participle or adjective whose noun is elided stays lowercase and ADJ, and owns the article as the Head of its phrase.",
		adrs: ["ADR-0036", "ADR-0040"],
		routes: lexeme("ADJ", "NOUN"),
		records: [
			"de/der-reisende-wartete-draussen",
			"de/der-reisende-haendler-wartete-draussen",
			"de/der-neue-brunnen-ist-tiefer-als-der-alte",
			"de/der-brief-ist-schon-geschrieben",
			"de/der-geschriebene-brief-lag-auf-dem-tisch",
			"de/die-mit-bleistift-geschriebene-notiz-lag-noch-auf-dem-tisch",
			"de/die-kartoffeln-sind-bereits-gekocht",
			"de/die-gekochten-kartoffeln-standen-schon-bereit",
			"de/die-tuer-ist-geschlossen",
			"de/auf-der-karte-sind-drei-seen-eingezeichnet",
			"de/die-eingezeichneten-seen-sind-jetzt-besser-zu-sehen",
			"de/der-lachende-junge-winkte-uns-zu",
			"de/sie-kam-lachend-herein",
			"de/er-sass-schweigend-am-fenster",
			"de/die-schlafenden-kinder-wurden-nicht-geweckt",
			"de/der-von-allen-bewunderte-lehrer-ging-in-den-ruhestand",
			"de/die-auf-ihn-abgestimmte-loesung-half-sofort",
			"de/die-aufgabe-bleibt-ungeloest",
			"de/sie-ist-verheiratet",
			"de/ein-interessierter-leser-fragte-nach",
			"de/die-angestellten-streikten-gestern",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/trotz-der-hektik-blieb-sie-ganz-gelassen",
			"de/der-alte-sass-allein-am-fenster",
			"de/als-gregor-samsa-eines-morgens-aus-unruhigen-traeumen",
		],
	},
];
