import type { Rule } from "../../corpus-types.js";
import { everyMultiword, lexeme } from "./routes.js";

/** Which Segments form one unit, whatever its route. */
export const units: Rule[] = [
	{
		id: "de/largest-fixed-unit",
		statement:
			"A click on a word selects the largest complete fixed unit that contains it. Every fixed member selects the same unit, and the unit is found by position in the sentence, never by spelling.",
		adrs: ["ADR-0003", "ADR-0039", "dumgen/ADR-0007"],
		routes: [],
		records: [
			"de/verbrannt-ist-alles-ganz-und-gar",
			"de/bei-dieser-formel-verstehe-ich-nur-bahnhof",
			"de/damit-triffst-du-den-nagel-auf-den-kopf",
			"de/guten-tag-ich-habe-einen-termin",
			"de/na-ja-ganz-ueberzeugt-bin-ich-nicht",
			"de/tut-mir-leid-das-war-mein-fehler",
			"de/genau-da-liegt-der-hase-im-pfeffer",
			"de/morgenstund-hat-gold-im-mund-sagte-sie-verschlafen",
			"de/wer-zuerst-kommt-mahlt-zuerst",
		],
	},
	{
		id: "de/fixed-members-only",
		statement:
			"A unit's members are the words it fixes, function words included. Free arguments, modifiers, fillers, punctuation and opaque text stay outside. Words are not fixed just because they stand together, often occur together or form an ordinary compositional phrase.",
		adrs: ["ADR-0003"],
		routes: [],
		records: [
			"de/bei-dieser-formel-verstehe-ich-nur-bahnhof",
			"de/damit-triffst-du-den-nagel-auf-den-kopf",
			"de/ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
			"de/genau-da-liegt-der-hase-im-pfeffer",
		],
	},
	{
		id: "de/locutions-and-sayings-are-made-of-lexemes",
		statement:
			"Every word belongs to exactly one target: the biggest unit it is part of. A word inside a Locution or a Saying has no target of its own in the sentence; the multiword unit leads to it through the Lemma's Breakdown.",
		adrs: ["ADR-0041", "dumgen/ADR-0007"],
		routes: everyMultiword,
		records: [
			"de/bei-dieser-formel-verstehe-ich-nur-bahnhof",
			"de/damit-triffst-du-den-nagel-auf-den-kopf",
			"de/guten-tag-ich-habe-einen-termin",
			"de/ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
			"de/na-ja-ganz-ueberzeugt-bin-ich-nicht",
			"de/genau-da-liegt-der-hase-im-pfeffer",
			"de/morgenstund-hat-gold-im-mund-sagte-sie-verschlafen",
			"de/wer-zuerst-kommt-mahlt-zuerst",
		],
	},
	{
		id: "de/unresolved-over-repair",
		statement:
			"A target is right only when its members are exactly the complete fixed unit the sentence realizes: no fixed member that is present is left out, and no free word is added. When membership is uncertain or contradictory, the answer is Unresolved; the group is never trimmed, extended or repaired. The one exception is haben with a participle that the sentence can't settle as perfect or state (de/sein-perfect-or-copula): it is grouped as the perfect, so a bare Er hat die Augen geschlossen gives [hat, geschlossen] VERB schließen.",
		adrs: ["ADR-0003", "ADR-0036", "dumgen/ADR-0007"],
		routes: [],
		records: ["de/er-hat-die-augen-geschlossen"],
	},
	{
		id: "de/no-target",
		statement:
			"A word has no target when no route for it is defensible: unintelligible text or a nonce word that no German or foreign word, name or plausible typo fits (xqzt, glorpen), a word broken off (trans…), an article whose noun phrase breaks off before its Head (das in Er brach das…), or a suspended-compound fragment with no right conjunct to complete it. The context must show the break, not an ellipsis alone, and no noun or demonstrative reading is made up: a complete Er brach das. gives das PRON. A nonce noun still owns its article, in one No Target: [der, Blarg]. The classifier answers Unresolved.",
		adrs: ["ADR-0037", "ADR-0040", "ADR-0045"],
		routes: [],
		records: [
			"de/das-wetter-ist-xqzt",
			"de/im-beispiel-sollte-die-figur-morgen-glorpen-doch-die",
			"de/der-blarg-tauchte-ohne-erklaerung-im-bericht-auf",
			"de/mit-dem-glorp-konnte-niemand-etwas-anfangen",
			"de/das-glossar-fuehrte-den-nicht-weiter-bestimmten-eintrag",
			"de/die-aufnahme-brach-mitten-im-begonnenen-wort-nach-trans",
			"de/die-sprecherin-begann-mit-unver-und-brach-das-wort-hoerbar",
			"de/er-brach-das",
		],
	},
	{
		id: "de/foreign-unless-duden-or-german-grammar",
		statement:
			"A word from another language that Duden lists in this meaning is a Lexeme of its real Kind, inflected or not: mit lol gives INTJ lol. An unlisted word is a Lexeme only when this occurrence shows German grammar on it: an ending (geyeetet gives VERB yeeten) or an agreeing article or determiner (der Hotfix). Filling a slot is not grammar, so sehr sus is a Foreign unit with its source language. A Foreign unit is one word or a phrase fixed in its source language (by the way); other foreign syntax gives one unit per word. Its Canonical Form corrects only position casing and typos.",
		adrs: ["ADR-0045"],
		routes: [
			{ language: "de", family: "Foreign", kind: "Foreign" },
			...lexeme("NOUN", "ADJ", "INTJ"),
		],
		records: [
			"de/er-antwortete-im-chat-nur-mit-lol",
			"de/in-der-jugendgruppe-fanden-alle-die-szene-ziemlich-cringe",
			"de/sein-kommentar-wirkt-cringe",
			"de/im-ansonsten-deutschen-gespraech-nannte-er-die-entscheidung",
			"de/im-deutsch-englischen-chat-war-mit-dem-tippfehler-wierd",
			"de/die-studentin-nannte-das-ergebnis-low-key-ueberraschend",
			"de/das-ist-sus",
			"de/im-deutschsprachigen-spielchat-wirkte-die-erklaerung-sehr",
			"de/das-war-ein-special-moment-fuer-das-team",
			"de/im-deutsch-englischen-gespraech-sagte-er-das-ist-not-okay",
			"de/das-meeting-war-very-good",
			"de/in-der-sonst-deutschen-unterhaltung-antwortete-sie-nur",
			"de/whatever-sagte-sie-am-anfang-ihrer-deutschen-antwort",
			"de/im-chat-war-mit-dem-fehlerhaft-geschriebenen-englischen-wort",
			"de/der-englische-ausdruck-off-grid-blieb-im-deutschen-gespraech",
			"de/die-britische-schreibvariante-colour-stand-in-der-deutschen",
			"de/vor-ihrer-meinung-schrieb-sie-im-deutschen-chat-tbh",
			"de/der-alte-forenbeitrag-endete-mit-dem-slangausdruck-w00t",
		],
	},
];
