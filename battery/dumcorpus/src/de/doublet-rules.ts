import type { Rule } from "../corpus-types.js";
import { lexeme } from "./rules.js";

/**
 * The German Doublet Rule (ADR 0048): one Lemma whose senses inflect
 * differently. It sits apart from `rules.ts`, which is past the file-token
 * limit. Its records are the gold a licence judge is scored on.
 */
export const doubletRules: readonly Rule[] = [
	{
		id: "de/meaning-conditioned-paradigm-doublets",
		statement:
			"Senses that inflect differently stay one Lemma; each Reading licenses the Paradigm Variants its sense takes. A dimension is Conditioned when some Reading takes only some of its variants: Bank 🪑 Bänke, 🏦 Banken; Mutter, Wort, Strauß, Druck, Gesicht; schleifen schliff or schleifte, and bewegen, hängen, schaffen, erschrecken, wiegen; senden 📨 sandte and sendete, 📡 only sendete, and wenden. It is Free when every Reading takes every variant: melken molk and melkte, Pizza Pizzen and Pizzas.",
		adrs: ["ADR-0048", "ADR-0038"],
		routes: lexeme("NOUN", "VERB"),
		records: [
			"de/an-der-wand-haengen-alte-drucke",
			"de/das-bild-hing-schief-an-der-wand",
			"de/das-kind-erschrak-vor-dem-hund",
			"de/das-kind-kennt-schon-viele-woerter",
			"de/das-radio-sendete-die-nachrichten",
			"de/der-bauer-melkte-die-kuh",
			"de/der-druck-in-den-reifen-ist-zu-niedrig",
			"de/der-hund-erschreckte-das-kind",
			"de/der-koch-schliff-das-messer",
			"de/der-koch-wendete-das-steak",
			"de/der-kuenstler-schuf-ein-neues-werk",
			"de/der-prophet-hatte-nachts-gesichte",
			"de/der-strauss-kann-nicht-fliegen",
			"de/der-wind-bewegte-die-blaetter",
			"de/die-bank-genehmigte-den-kredit",
			"de/die-mutter-passt-nicht-auf-diese-schraube",
			"de/die-mutter-wiegte-das-baby",
			"de/die-pizza-ist-noch-heiss",
			"de/er-hat-ein-freundliches-gesicht",
			"de/er-kaufte-einen-strauss-tulpen",
			"de/er-legte-auf-ohne-ein-wort-zu-sagen",
			"de/er-schleifte-den-sack-ueber-den-hof",
			"de/er-wandte-den-blick-nach-westen",
			"de/er-wog-vielleicht-ein-halbes-lot",
			"de/meine-mutter-ruft-jeden-sonntag-an",
			"de/sie-haengte-das-bild-an-die-wand",
			"de/sie-sandte-ihm-einen-brief",
			"de/sie-schaffte-die-pruefung",
			"de/was-bewog-ihn-dazu",
			"de/wir-sitzen-auf-einer-bank-im-park",
		],
	},
];
