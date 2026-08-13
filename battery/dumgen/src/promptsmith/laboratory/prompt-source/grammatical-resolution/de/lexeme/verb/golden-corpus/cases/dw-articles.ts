import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finite, inflection, ordinaryCore } from "./builders";

const participle = {
	aspect: null,
	gender: null,
	mood: null,
	number: null,
	person: null,
	tense: null,
	verbForm: "Part" as const,
	voice: null,
};

const infinitive = {
	mood: null,
	number: null,
	person: null,
	tense: null,
	verbForm: "Inf" as const,
	voice: null,
};

export const dwArticleCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-dw-future-beteiligen": {
			input: {
				markedContext:
					'"Deutschland <TARGET>wird</TARGET> <TARGET>sich</TARGET> <TARGET>an</TARGET> diesem Manöver <TARGET>beteiligen</TARGET>", sagte Regierungssprecher Stefan Kornelius der Deutschen Presse-Agentur.',
				members: ["wird", "sich", "an", "beteiligen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["wird", "sich", "an", "beteiligen"],
				canonicalForm: "sich beteiligen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				coreFeatures: {
					hasGovPrep: "an",
					hasSepPrefix: null,
					lexicallyReflexive: "Yes",
				},
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/deutschland-nimmt-an-ukraine-man%C3%B6ver-teil-koalition-der-willigen-drohnen-abkommen-eu-von-der-leyen/a-77967914",
			],
		},
		"grammar-de-verb-dw-separable-aufsetzen": {
			input: {
				markedContext:
					"Zahnärztin Shimaa Mahmoud <TARGET>setzt</TARGET> sich eine Gesichtsmaske <TARGET>auf</TARGET>.",
				members: ["setzt", "auf"],
			},
			idealOutput: finite(
				["setzt", "auf"],
				"aufsetzen",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, hasSepPrefix: "auf" },
				["Standard", "Standard"],
			),
			explanation: "sich ordinary object. Not member.",
			contaminationKeys: [
				"source:https://amp.dw.com/de/krieg-im-sudan-gesundheitsversorgung-im-exil/a-75817375",
			],
		},
		"grammar-de-verb-dw-perfect-etabliert": {
			input: {
				markedContext:
					"Die Weltordnung, die <TARGET>sich</TARGET> nach dem Zweiten Weltkrieg <TARGET>etabliert</TARGET> <TARGET>hat</TARGET>, scheint an ihr Ende gekommen zu sein.",
				members: ["sich", "etabliert", "hat"],
			},
			idealOutput: inflection({
				normalizedMembers: ["sich", "etabliert", "hat"],
				canonicalForm: "sich etablieren",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: {
					...ordinaryCore,
					lexicallyReflexive: "Yes",
				},
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/das-entstehen-einer-neuen-weltordnung/a-77552455",
			],
		},
		"grammar-de-verb-dw-perfect-eingependelt": {
			input: {
				markedContext:
					"Mittlerweile <TARGET>hat</TARGET> <TARGET>sich</TARGET> der Preis auf rund 4150 US-Dollar pro Feinunze <TARGET>eingependelt</TARGET> (Stand 27. November).",
				members: ["hat", "sich", "eingependelt"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "sich", "eingependelt"],
				canonicalForm: "sich einpendeln",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: {
					hasGovPrep: null,
					hasSepPrefix: "ein",
					lexicallyReflexive: "Yes",
				},
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/goldpreis-hype-um-papiergold-heizt-spekulation-an/a-74885073",
			],
		},
		"grammar-de-verb-dw-perfect-ausgeschlossen": {
			input: {
				markedContext:
					"Die tansanische Wahlkommission <TARGET>hat</TARGET> die CHADEMA-Partei des Oppositionsführers Tundu Lissu <TARGET>von</TARGET> den Präsidentschafts- und Parlamentswahlen 2025 <TARGET>ausgeschlossen</TARGET>.",
				members: ["hat", "von", "ausgeschlossen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "von", "ausgeschlossen"],
				canonicalForm: "ausschließen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: {
					hasGovPrep: "von",
					hasSepPrefix: "aus",
					lexicallyReflexive: null,
				},
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/welche-rolle-spielen-digital-natives-bei-tansanias-wahlen/a-72886910",
			],
		},
		"grammar-de-verb-dw-separable-nachwirken": {
			input: {
				markedContext:
					"Die Eindrücke <TARGET>wirken</TARGET> noch <TARGET>nach</TARGET>, sagt der Historiker beim Treffen mit der DW in seiner Berliner Wohnung.",
				members: ["wirken", "nach"],
			},
			idealOutput: finite(
				["wirken", "nach"],
				"nachwirken",
				{
					mood: "Ind",
					number: "Plur",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, hasSepPrefix: "nach" },
				["Standard", "Standard"],
			),
			contaminationKeys: [
				"source:https://amp.dw.com/de/ukraine-historiker-schl%C3%B6gel-warnt-vor-spaltung-europas/a-74248079",
			],
		},
		"grammar-de-verb-dw-passive-weitergeleitet": {
			input: {
				markedContext:
					"Fest steht: Das alte Umlagesystem, bei dem die Beiträge der Angestellten direkt <TARGET>an</TARGET> die Rentner <TARGET>weitergeleitet</TARGET> <TARGET>werden</TARGET>, ist an seine Grenzen gekommen.",
				members: ["an", "weitergeleitet", "werden"],
			},
			idealOutput: inflection({
				normalizedMembers: ["an", "weitergeleitet", "werden"],
				canonicalForm: "weiterleiten",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: {
					hasGovPrep: "an",
					hasSepPrefix: "weiter",
					lexicallyReflexive: null,
				},
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/europa-ringt-um-die-zukunft-der-rente/a-74925391",
			],
		},
		"grammar-de-verb-dw-future-finden": {
			input: {
				markedContext:
					"Auch Emilia <TARGET>wird</TARGET> vermutlich schnell einen Job <TARGET>finden</TARGET>, sobald sie fertig mit ihrem Studium der nachhaltigen Mode sein wird.",
				members: ["wird", "finden"],
			},
			idealOutput: inflection({
				normalizedMembers: ["wird", "finden"],
				canonicalForm: "finden",
				memberOrthographies: ["Standard", "Standard"],
				inflectionalFeatures: infinitive,
			}),
			explanation: "First wird member. Last wird other verb.",
			contaminationKeys: [
				"source:https://amp.dw.com/de/zukunft-stadtplanung-wie-werden-wir-leben-transport-nahrung-stadtentwicklung/a-74137152",
			],
		},
		"grammar-de-verb-dw-modal-passive-hergestellt": {
			input: {
				markedContext:
					"Die Impfstofflieferung für die EU soll in den Produktionsstätten von Biontech in Deutschland sowie in Pfizers Werken in Belgien <TARGET>hergestellt</TARGET> <TARGET>werden</TARGET>.",
				members: ["hergestellt", "werden"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hergestellt", "werden"],
				canonicalForm: "herstellen",
				memberOrthographies: ["Standard", "Standard"],
				coreFeatures: { ...ordinaryCore, hasSepPrefix: "her" },
				inflectionalFeatures: participle,
			}),
			explanation: "soll modal. Not member. werden passive member.",
			contaminationKeys: [
				"source:https://www.dw.com/de/eu-sichert-sich-300-millionen-biontech-impfdosen-f%C3%BCr-europa/a-55566897",
			],
		},
		"grammar-de-verb-dw-pluperfect-angekuendigt": {
			input: {
				markedContext:
					"Die Grünen <TARGET>hatten</TARGET> in ihrem Wahlprogramm <TARGET>angekündigt</TARGET>, dass sie gegenüber der Türkei eine prinzipienfestere Politik verfolgen und stärker auf Menschenrechte und Rechtsstaatlichkeit achten wollen.",
				members: ["hatten", "angekündigt"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hatten", "angekündigt"],
				canonicalForm: "ankündigen",
				memberOrthographies: ["Standard", "Standard"],
				coreFeatures: { ...ordinaryCore, hasSepPrefix: "an" },
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://www.dw.com/de/%C3%A4g%C3%A4is-konflikt-die-t%C3%BCrkei-schafft-fakten/a-62910995",
			],
		},
		"grammar-de-verb-dw-passive-aufgefressen": {
			input: {
				markedContext:
					"Diese Erfolge <TARGET>werden</TARGET> jedoch von den steigenden Emissionen im Verkehrs- und Gebäudesektor <TARGET>aufgefressen</TARGET>.",
				members: ["werden", "aufgefressen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["werden", "aufgefressen"],
				canonicalForm: "auffressen",
				memberOrthographies: ["Standard", "Standard"],
				coreFeatures: { ...ordinaryCore, hasSepPrefix: "auf" },
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/klimamassnahmen-co2-deutschland-klimaschutz-reicht-nicht-aus-klimaklage-w%C3%A4rmepumpe-verkehr/a-76527298",
			],
		},
		"grammar-de-verb-dw-perfect-ausgesprochen": {
			input: {
				markedContext:
					"Der Deutsche Ärztetag, die Vertretung der Mediziner in Deutschland, <TARGET>hat</TARGET> <TARGET>sich</TARGET> <TARGET>für</TARGET> ein Verbot jeder Form der organisierten Sterbehilfe <TARGET>ausgesprochen</TARGET>.",
				members: ["hat", "sich", "für", "ausgesprochen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "sich", "für", "ausgesprochen"],
				canonicalForm: "sich aussprechen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				coreFeatures: {
					hasGovPrep: "für",
					hasSepPrefix: "aus",
					lexicallyReflexive: "Yes",
				},
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://www.dw.com/de/kein-europ%C3%A4isches-urteil-zur-sterbehilfe/a-16100150",
			],
		},
		"grammar-de-verb-dw-perfect-passive-aufgefunden": {
			input: {
				markedContext:
					"In Südkorea <TARGET>ist</TARGET> der junge Musiker und Schauspieler Cha In-ha (Artikelbild) tot in seinem Haus in der Hauptstadt Seoul <TARGET>aufgefunden</TARGET> <TARGET>worden</TARGET>.",
				members: ["ist", "aufgefunden", "worden"],
			},
			idealOutput: inflection({
				normalizedMembers: ["ist", "aufgefunden", "worden"],
				canonicalForm: "auffinden",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: { ...ordinaryCore, hasSepPrefix: "auf" },
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/wieder-ersch%C3%BCttert-todesfall-die-k-pop-szene/a-51524053",
			],
		},
		"grammar-de-verb-dw-pluperfect-passive-verschifft": {
			input: {
				markedContext:
					"Durch die Meerenge <TARGET>war</TARGET> zuvor fast ein Fünftel des weltweit verbrauchten Rohöls <TARGET>verschifft</TARGET> <TARGET>worden</TARGET>.",
				members: ["war", "verschifft", "worden"],
			},
			idealOutput: inflection({
				normalizedMembers: ["war", "verschifft", "worden"],
				canonicalForm: "verschiffen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				inflectionalFeatures: participle,
			}),
			contaminationKeys: [
				"source:https://amp.dw.com/de/usa-lockern-weiter-sanktionen-gegen-russischen-oel/a-76841076",
			],
		},
		"grammar-de-verb-dw-separable-vorbereiten": {
			input: {
				markedContext:
					"Die Bundeswehr <TARGET>bereitet</TARGET> <TARGET>sich</TARGET> <TARGET>auf</TARGET> einen möglichen Minenräum-Einsatz in der Straße von Hormus <TARGET>vor</TARGET>.",
				members: ["bereitet", "sich", "auf", "vor"],
			},
			idealOutput: finite(
				["bereitet", "sich", "auf", "vor"],
				"sich vorbereiten",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{
					hasGovPrep: "auf",
					hasSepPrefix: "vor",
					lexicallyReflexive: "Yes",
				},
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: [
				"source:https://amp.dw.com/de/bundeswehr-bereitet-einsatz-in-der-stra%C3%9Fe-von-hormus-vor/a-77604603",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
