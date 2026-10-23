import type { Rule } from "../../corpus-types.js";
import { lexeme } from "./routes.js";

export const nouns: Rule[] = [
	{
		id: "de/substantivized-infinitive-is-a-noun",
		statement:
			"A capitalized infinitive used as a noun is a NOUN of its own with gender Neut, never the VERB: das Schwimmen, sein ständiges Meckern.",
		adrs: ["ADR-0002", "ADR-0040"],
		routes: lexeme("NOUN", "VERB"),
		records: [
			"de/das-rennen-hat-spass-gemacht",
			"de/schwimmen-ist-gesund",
			"de/sein-staendiges-meckern-nervt",
		],
	},
	{
		id: "de/noun-owns-its-article",
		statement:
			"The Head of a noun phrase owns the article that opens it, across adjectives, numerals and extended attributes, and a click on the article selects the Head: der steile Aufstieg gives [der, Aufstieg] NOUN and [steile] ADJ. When the noun is elided, the word standing in for it is the Head. An article cut off from its Head by a verb, a clause boundary or a noun outside such an attribute is not its article. The article is a member, never a feature: its spelling, read through a fused or shortened form, names the cell of der or ein for its Head's case, number and gender, and that cell is its DET.",
		adrs: ["ADR-0035", "ADR-0040", "ADR-0041"],
		routes: lexeme("NOUN", "PROPN", "ADJ", "NUM", "PRON"),
		records: [
			"de/das-wetter-ist-xqzt",
			"de/es-zog-der-wilde-jaegersmann",
			"de/ich-bin-im-wald",
			"de/die-drei-maedchen-spielen-draussen",
			"de/der-neue-brunnen-ist-tiefer-als-der-alte",
			"de/der-reisende-wartete-draussen",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/am-naechsten-morgen-war-alles-anders",
			"de/das-kind-spielt-im-garten",
			"de/er-zaehlt-eins-und-kauft-danach-einen-mantel",
			"de/das-rote-band-lag-auf-dem-geschenk",
			"de/der-dritte-band-ist-laengst-vergriffen",
			"de/die-band-spielt-heute-im-kellerclub",
			"de/das-schloss-an-der-tuer-klemmt",
			"de/das-schloss-ueber-dem-fluss-wurde-renoviert",
			"de/die-mutter-passt-nicht-auf-diese-schraube",
			"de/der-kiefer-schmerzte-nach-der-operation",
			"de/die-alte-kiefer-steht-am-hang",
			"de/der-leiter-der-werkstatt-kam-spaeter",
			"de/die-leiter-wackelte-auf-dem-nassen-boden",
			"de/die-angestellten-streikten-gestern",
			"de/mit-den-kindern-ist-es-nie-langweilig",
			"de/sie-folgte-ihrem-herzen",
			"de/unter-falschem-namen-mietete-er-das-zimmer",
			"de/viele-vermissen-das-alte-berlin",
			"de/das-rennen-hat-spass-gemacht",
			"de/schwimmen-ist-gesund",
			"de/in-berlin-betreibt-die-bvg-die-u-bahn",
			"de/die-peitsche-hat-er-mitgebracht",
			"de/er-wog-vielleicht-ein-halbes-lot",
			"de/das-problem-ist-der-preis",
			"de/dein-garten-ist-gross-der-meine-ist-klein",
			"de/der-musiktempel-zwischen-nadelbaeumen-versteckt-stand",
			"de/k-wartete-noch-ein-weilchen-sah-von-seinem-kopfkissen-aus",
		],
	},
	{
		id: "de/adjectival-noun-lemma",
		statement:
			"An adjective or participle used as a noun for a person (der Reisende, ein Verletzter) is one Lemma for both sexes, cited in its weak form after the definite article (Reisende, Verletzte), with gender null. Its singular Surface marks the gender its form shows, and the article agrees: der Reisende is Masc, die Angestellte Fem. A plural marks none. A neuter with a meaning of its own is a separate Lemma with gender Neut: ins Deutsche übersetzen gives Deutsche.",
		adrs: ["ADR-0040", "ADR-0002"],
		routes: lexeme("NOUN"),
		records: [
			"de/der-reisende-wartete-draussen",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/die-angestellte-oeffnete-uns-die-tuer",
			"de/die-angestellten-streikten-gestern",
			"de/wir-danken-den-angestellten-fuer-ihre-hilfe",
			"de/die-reisenden-steigen-am-bahnhof-aus",
			"de/auf-dem-bahnsteig-warten-dreizehn-reisende",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/der-reisende-haendler-wartete-draussen",
			"de/der-alte-sass-allein-am-fenster",
		],
	},
	{
		id: "de/neuter-adjectival-noun",
		statement:
			"An adjective or participle used as a neuter noun for a thing or an abstraction is a NOUN Lemma with gender Neut, cited in its weak form (das Böse gives Böse), whether a dictionary lists it or it is formed on the spot: etwas Böses and nichts Neues give NOUN Böse and Neue. It is a Lemma apart from the person noun of the same spelling (der Böse, gender null).",
		adrs: ["ADR-0040", "ADR-0002"],
		routes: lexeme("NOUN"),
		records: [
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
			"de/jemand-musste-josef-k-verleumdet-haben-denn-ohne-dass-er",
		],
	},
	{
		id: "de/plural-only-noun-has-no-gender",
		statement:
			"A noun with no singular, one the dictionary gives only in the plural (Leute, Eltern, Ferien, Kosten), has gender null. Gender is read from the nominative singular, and such a noun has none to read it from. It is cited in its plural, and its Surfaces are plural and mark no gender. A noun the dictionary gives a singular keeps that singular's gender, even where it is mostly used in the plural: die Lebensmittel is das Lebensmittel, Neut.",
		adrs: ["ADR-0002", "ADR-0032", "ADR-0040"],
		routes: lexeme("NOUN"),
		records: [
			"de/die-eltern-warten-draussen",
			"de/die-ferien-beginnen-morgen",
			"de/hallo-leute-hoert-kurz-zu",
		],
	},
	{
		id: "de/noun-gender-in-free-variation",
		statement:
			"A noun the dictionary gives more than one gender in the same sense has a mixed Core gender naming them in catalog order, Fem, Masc, Neut: Balg in the child sense, Duden der oder das, is mixed Masc and Neut, and Cola, das oder die, mixed Fem and Neut. Its article agrees with any of them, so das Balg and der Balg both attest it and die Balg fails. A gender that changes the meaning makes separate Lemmas, each with one gender: der See (lake) and die See (sea), der and das Band. Where the dictionary gives the senses apart, each sense takes its own: der Balg (skin) is Masc.",
		adrs: ["ADR-0002", "ADR-0032", "ADR-0040"],
		routes: lexeme("NOUN"),
		records: [
			"de/mit-den-kindern-ist-es-nie-langweilig",
			"de/der-kellner-bringt-eine-cola",
		],
	},
	{
		id: "de/only-der-and-ein-are-articles",
		statement:
			"Only forms of der, die, das and ein are articles, including the article piece of a fused word (m in im) and a shortened article ('ne, 'nen). mein, dieser, kein and other determiners are DETs of their own: kein Haus gives [kein] DET and [Haus] NOUN. The der- part of derselbe and derjenige belongs to the word, not an article, fused piece included: am selben Morgen gives [m, selben] DET derselbe with Full coverage, and Morgen no article.",
		adrs: ["ADR-0035", "ADR-0040"],
		routes: lexeme("NOUN", "DET"),
		records: [
			"de/ich-bin-im-wald",
			"de/da-steht-ne-kiste-auf-dem-flur",
			"de/wir-brauchen-fuer-den-transport-noch-n-auto",
			"de/sie-folgte-ihrem-herzen",
			"de/sein-staendiges-meckern-nervt",
			"de/bitte-folgen-sie-ihrem-ansprechpartner",
			"de/er-vergass-seinen-schluessel-im-buero",
			"de/mit-keinem-wort-erwaehnte-sie-den-plan",
			"de/am-selben-morgen-fiel-erneut-der-strom-aus",
			"de/an-demselben-morgen-fiel-erneut-der-strom-aus",
			"de/am-ende-desselben-tages-fiel-der-strom-aus",
		],
	},
	{
		id: "de/shared-article-in-coordination",
		statement:
			"In coordinated nouns that agree, only the closest noun owns the article: der Aufstieg und Abstieg gives [der, Aufstieg] and [Abstieg], and Abstieg records der as a shared article with Partial coverage. Closest counts Segments within that noun phrase, nested phrases aside, and a tie is Unresolved. Nearness alone never licenses sharing, and another article or a clause boundary ends it.",
		adrs: ["ADR-0003", "ADR-0035", "ADR-0040"],
		routes: lexeme("NOUN"),
		records: [
			"de/der-aufstieg-und-abstieg",
			"de/der-aufstieg-und-abstieg-und-umstieg",
			"de/der-aufstieg-und-der-abstieg",
		],
	},
	{
		id: "de/proper-noun-article",
		statement:
			"A proper noun cited with its definite article (die Schweiz) has Core article Definite and owns that article as a common noun does, fused pieces included: im Rhein gives [i] ADP and [m, Rhein] PROPN. Names of streets, squares, rivers, mountains and buildings are cited with it, as is a title whose article inflects. A name cited bare (Berlin) has none but owns the article that opens its phrase. A surname, full name or coined name has no Core gender, unlike a first name: its Surface marks the gender an owned article or agreeing adjective shows, and must if it owns one (der junge Schwarzkopf).",
		adrs: ["ADR-0035", "ADR-0040"],
		routes: lexeme("PROPN"),
		records: [
			"de/am-samstag-sehen-wir-die-zauberfloete-in-der-oper",
			"de/er-badet-im-rhein",
			"de/mr-und-mrs-parker-wohnen-im-fliederweg-nummer-7",
			"de/ich-wohne-im-alten-berlin",
			"de/viele-vermissen-das-alte-berlin",
			"de/in-berlin-betreibt-die-bvg-die-u-bahn",
			"de/sieh-einmal-hier-steht-er",
			"de/die-nato-beraet-heute-ueber-den-antrag",
			"de/im-sommer-besucht-sie-die-schweiz",
			"de/der-junge-schwarzkopf-schritt-in-seinem-grauen-filzhut-sein",
			"de/die-koechin-der-frau-grubach-seiner-zimmervermieterin-die",
			"de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art",
			"de/ach-treibel-sie-sind-ewig-ein-spoetter",
			"de/jemand-musste-josef-k-verleumdet-haben-denn-ohne-dass-er",
			"de/als-gregor-samsa-eines-morgens-aus-unruhigen-traeumen",
			// A brand that takes ein and a plural is not cited with das.
			"de/sie-testet-das-neue-iphone-im-labor",
		],
	},
	{
		id: "de/organisation-name-takes-its-article",
		statement:
			"The name of an organisation, such as a party, broadcaster, authority, armed force, firm or international body, that German uses with the definite article is cited with it: die SPD, das ZDF, die UNESCO, die Bundeswehr. It has Core article Definite, its gender is that article's, and it owns the article in a sentence as a common noun does. An organisation German names without an article (adidas) is cited bare, as any bare name is.",
		adrs: ["ADR-0035", "ADR-0040"],
		routes: lexeme("PROPN"),
		records: [
			"de/die-spd-beschloss-ein-neues-programm",
			"de/das-zdf-uebertraegt-die-debatte-live",
			"de/die-unesco-foerdert-das-neue-bildungsprojekt",
			"de/die-nato-beraet-heute-ueber-den-antrag",
			"de/in-berlin-betreibt-die-bvg-die-u-bahn",
			"de/die-deutsche-bank-veroeffentlichte-den-bericht",
			"de/das-rote-kreuz-eroeffnete-eine-neue-beratungsstelle",
			"de/die-kampagne-stellt-adidas-in-den-mittelpunkt",
		],
	},
	{
		id: "de/title-before-a-name",
		statement:
			"A title or form of address before a name (Herr, Frau, Dr., Mr, Mrs) is a common noun of its own, and the name a separate PROPN. It takes the name's case and number, unless it addresses someone. An abbreviated title stands for its expansion, also without the dot British usage drops: Mr und Mrs Parker gives [Mr] NOUN Mister and [Mrs] NOUN Missis.",
		adrs: ["ADR-0035"],
		routes: lexeme("NOUN", "PROPN"),
		records: [
			"de/mr-und-mrs-parker-wohnen-im-fliederweg-nummer-7",
			"de/dipl-ing-mueller-leitet-das-projekt",
		],
	},
	{
		id: "de/coined-name-substitute-is-propn",
		statement:
			"A fixed name-substitute or nickname coined for one referent is a PROPN, even when it is built from a pronoun or a clause: Du-weißt-schon-wer and Er-dessen-Name-nicht-genannt-werden-darf name one person, as a name does. Written with hyphens, it is one Segment and one Lexeme PROPN, never a PRON. As a coined name it has no Core gender (de/proper-noun-article).",
		adrs: [],
		routes: lexeme("PROPN", "PRON"),
		records: [
			"de/freuen-wir-uns-denn-du-weisst-schon-wer-ist-endlich-fort",
		],
	},
];
