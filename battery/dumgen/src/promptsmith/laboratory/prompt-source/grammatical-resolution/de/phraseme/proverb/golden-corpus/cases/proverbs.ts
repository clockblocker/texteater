import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedProverb } from "./builders";

export const proverbCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-proverb-demo-morgenstund-attribution": {
			...resolvedProverb({
				attested: "Morgenstund hat Gold im Mund",
				prefix: "Als die Enkel über das frühe Aufstehen klagten, erinnerte die Großmutter sie: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:morgenstund-hat-gold-im-mund"],
			explanation:
				"The attribution, quotation marks, and punctuation remain outside the authoritative members.",
		},
		"grammar-de-proverb-demo-aller-anfang-typo": {
			...resolvedProverb({
				attested: "Aller Anfank ist schwer",
				normalized: "Aller Anfang ist schwer",
				canonical: "Aller Anfang ist schwer",
				typoMemberIndices: [1],
				prefix: "Auf dem fehlerhaften Übungsblatt stand das Sprichwort „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:aller-anfang-ist-schwer"],
			explanation:
				"The real spelling error is repaired only in its selected member.",
		},
		"grammar-de-proverb-demo-was-heute-punctuation": {
			...resolvedProverb({
				attested:
					"Was du heute kannst besorgen, das verschiebe nicht auf morgen",
				prefix: "Vor der Abreise mahnte der Vater: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:was-du-heute-kannst-besorgen"],
			explanation:
				"Internal and terminal punctuation is context, not lexical membership or Canonical Form.",
		},
		"grammar-de-proverb-dev-andere-laender": {
			...resolvedProverb({
				attested: "Andere Länder, andere Sitten",
				prefix: "Nachdem die Reisenden über ungewohnte Essenszeiten gesprochen hatten, sagte ihre Begleiterin: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:andere-laender-andere-sitten"],
		},
		"grammar-de-proverb-dev-ende-gut": {
			...resolvedProverb({
				attested: "Ende gut, alles gut",
				prefix: "Als die Aufführung trotz der Panne gelang, fasste der Regisseur den Abend zusammen: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:ende-gut-alles-gut"],
		},
		"grammar-de-proverb-dev-uebung-meister": {
			...resolvedProverb({
				attested: "Übung macht den Meister",
				prefix: "Nach dem ersten misslungenen Versuch ermutigte die Trainerin den Schüler mit „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:uebung-macht-den-meister"],
		},
		"grammar-de-proverb-dev-viele-koeche": {
			...resolvedProverb({
				attested: "Viele Köche verderben den Brei",
				prefix: "Als fünf Personen gleichzeitig den Ablauf ändern wollten, warnte die Projektleiterin: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:viele-koeche-verderben-den-brei"],
		},
		"grammar-de-proverb-dev-grube": {
			...resolvedProverb({
				attested: "Wer anderen eine Grube gräbt, fällt selbst hinein",
				prefix: "Nachdem der Intrigant an seinem eigenen Plan gescheitert war, bemerkte seine Kollegin: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:wer-anderen-eine-grube-graebt"],
		},
		"grammar-de-proverb-dev-zuletzt-lacht": {
			...resolvedProverb({
				attested: "Wer zuletzt lacht, lacht am besten",
				prefix: "Nach dem unerwarteten Sieg erinnerte der Kapitän die Spötter: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:wer-zuletzt-lacht-lacht-am-besten"],
		},
		"grammar-de-proverb-dev-stille-wasser": {
			...resolvedProverb({
				attested: "Stille Wasser sind tief",
				prefix: "Als der schweigsame Bewerber die beste Analyse vorlegte, sagte die Chefin: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:stille-wasser-sind-tief"],
		},
		"grammar-de-proverb-dev-gelegenheit-diebe": {
			...resolvedProverb({
				attested: "Gelegenheit macht Diebe",
				prefix: "Beim Abschließen des Lagerraums erklärte der Hausmeister seine Vorsicht: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:gelegenheit-macht-diebe"],
		},
		"grammar-de-proverb-dev-apfel-stamm": {
			...resolvedProverb({
				attested: "Der Apfel fällt nicht weit vom Stamm",
				prefix: "Als Mutter und Tochter denselben Beruf wählten, kommentierte der Onkel: „",
				suffix: ".“",
			}),
			contaminationKeys: [
				"de-proverb:der-apfel-faellt-nicht-weit-vom-stamm",
			],
		},
		"grammar-de-proverb-dev-kleinvieh": {
			...resolvedProverb({
				attested: "Kleinvieh macht auch Mist",
				prefix: "Als sich die kleinen monatlichen Beträge summierten, sagte die Sparerin: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:kleinvieh-macht-auch-mist"],
		},
		"grammar-de-proverb-dev-luegen-beine": {
			...resolvedProverb({
				attested: "Lügen haben kurze Beine",
				prefix: "Nachdem die erfundene Ausrede sofort aufflog, stellte der Lehrer fest: „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:luegen-haben-kurze-beine"],
		},
		"grammar-de-proverb-dev-reden-silber": {
			...resolvedProverb({
				attested: "Reden ist Silber, Schweigen ist Gold",
				prefix: "Bevor die Zeugin antwortete, erinnerte ihr Anwalt sie an den Satz „",
				suffix: ".“",
			}),
			contaminationKeys: [
				"de-proverb:reden-ist-silber-schweigen-ist-gold",
			],
		},
		"grammar-de-proverb-dev-wer-rastet": {
			...resolvedProverb({
				attested: "Wer rastet, der rostet",
				prefix: "Nach der Winterpause begann die Laufgruppe wieder zu trainieren, denn „",
				suffix: ".“",
			}),
			contaminationKeys: ["de-proverb:wer-rastet-der-rostet"],
		},
		"grammar-de-proverb-dev-repeated-das": {
			...resolvedProverb({
				attested:
					"Was du nicht willst, das man dir tu, das füg auch keinem andern zu",
				prefix: "Als der Schüler sich über denselben Streich beschwerte, zitierte die Lehrerin: „",
				suffix: ".“",
			}),
			explanation:
				"Both occurrences of das are authoritative positions in one proverb and remain separate members.",
		},
		"grammar-de-proverb-accept-wer-zuerst": {
			...resolvedProverb({
				attested: "Wer zuerst kommt, mahlt zuerst",
				prefix: "Vor dem Kartenverkauf wies die Veranstalterin auf die begrenzten Plätze hin: „",
				suffix: ".“",
			}),
		},
		"grammar-de-proverb-accept-wo-rauch": {
			...resolvedProverb({
				attested: "Wo Rauch ist, ist auch Feuer",
				prefix: "Als mehrere voneinander unabhängige Hinweise eintrafen, meinte der Redakteur: „",
				suffix: ".“",
			}),
		},
		"grammar-de-proverb-accept-wo-wille": {
			...resolvedProverb({
				attested: "Wo ein Wille ist, ist auch ein Weg",
				prefix: "Trotz des knappen Zeitplans blieb die Ingenieurin zuversichtlich: „",
				suffix: ".“",
			}),
		},
		"grammar-de-proverb-accept-geteiltes-leid": {
			...resolvedProverb({
				attested: "Geteiltes Leid ist halbes Leid",
				prefix: "Nachdem er seine Sorge endlich erzählt hatte, erinnerte ihn seine Freundin: „",
				suffix: ".“",
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
