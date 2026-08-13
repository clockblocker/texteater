import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, discourseFormulaInput } from "./builders";

export const formulaCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-discourse-formula-demo-guten-morgen": {
			input: discourseFormulaInput(
				"Obwohl am Empfang schon jemand ‚Hallo!‘ gerufen hatte, begrüßte Lea die neue Kollegin mit „<TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>, Frau Keller!“",
			),
			idealOutput: citation({
				normalizedMembers: ["guten", "Morgen"],
				canonicalForm: "guten morgen",
				role: "Greeting",
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"The marked formula performs the greeting; the nearby interjection and vocative remain context.",
		},
		"grammar-de-discourse-formula-demo-es-tut-mir-leid-discontinuous": {
			input: discourseFormulaInput(
				"Nachdem er die Vase zerbrochen hatte, sagte er: „<TARGET>Es</TARGET> <TARGET>tut</TARGET> <TARGET>mir</TARGET>, wirklich, <TARGET>leid</TARGET>, dass das passiert ist.“",
			),
			idealOutput: citation({
				normalizedMembers: ["es", "tut", "mir", "leid"],
				canonicalForm: "es tut mir leid",
				role: "Apology",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
			explanation:
				"The parenthetical intensifier and following complement do not become fixed formula members.",
		},
		"grammar-de-discourse-formula-demo-vielen-dank-complement": {
			input: discourseFormulaInput(
				"Nach der schnellen Reparatur sagte der Mieter: „<TARGET>Vielen</TARGET> <TARGET>Dank</TARGET> für Ihre Hilfe.“",
			),
			idealOutput: citation({
				normalizedMembers: ["vielen", "Dank"],
				canonicalForm: "vielen dank",
				role: "Thanks",
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"The free für complement remains outside the fixed thanks formula.",
		},
		"grammar-de-discourse-formula-demo-ach-du-meine-guete-vocative": {
			input: discourseFormulaInput(
				"Als die Leiter umkippte, rief sie: „<TARGET>Ach</TARGET> <TARGET>du</TARGET> <TARGET>meine</TARGET> <TARGET>Güte</TARGET>, Paul!“",
			),
			idealOutput: citation({
				normalizedMembers: ["ach", "du", "meine", "Güte"],
				canonicalForm: "ach du meine güte",
				role: "Reaction",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
			explanation:
				"The formula reacts to the accident; the name after it is a vocative.",
		},
		"grammar-de-discourse-formula-demo-mfg-variant": {
			input: discourseFormulaInput(
				"Am Ende der dienstlichen Nachricht stand als Grußformel: „<TARGET>MfG</TARGET>“.",
			),
			idealOutput: citation({
				normalizedMembers: ["MfG"],
				canonicalForm: "mit freundlichen grüßen",
				role: "Farewell",
				memberOrthographies: ["Standard"],
				spelling: "Variant",
			}),
			explanation:
				"The conventional abbreviation fully realizes the farewell formula as a licensed spelling variant.",
		},
		"grammar-de-discourse-formula-dev-auf-wiedersehen": {
			input: discourseFormulaInput(
				"Als der letzte Zug einfuhr, verabschiedete sich Mira mit „<TARGET>Auf</TARGET> <TARGET>Wiedersehen</TARGET>“.",
			),
			idealOutput: citation({
				normalizedMembers: ["auf", "Wiedersehen"],
				canonicalForm: "auf wiedersehen",
				role: "Farewell",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-dev-gern-geschehen": {
			input: discourseFormulaInput(
				"Auf den Dank des Nachbarn antwortete sie: „<TARGET>Gern</TARGET> <TARGET>geschehen</TARGET>.“",
			),
			idealOutput: citation({
				normalizedMembers: ["gern", "geschehen"],
				canonicalForm: "gern geschehen",
				role: "Acknowledgment",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-dev-nein-danke": {
			input: discourseFormulaInput(
				"„Möchten Sie noch Kuchen?“ – „<TARGET>Nein</TARGET> <TARGET>danke</TARGET>, ich bin satt.“",
			),
			idealOutput: citation({
				normalizedMembers: ["nein", "danke"],
				canonicalForm: "nein danke",
				role: "Refusal",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-dev-darf-ich-bitten": {
			input: discourseFormulaInput(
				"Als das Gespräch lauter wurde, fragte die Vorsitzende: „<TARGET>Darf</TARGET> <TARGET>ich</TARGET> um Ruhe <TARGET>bitten</TARGET>?“",
			),
			idealOutput: citation({
				normalizedMembers: ["darf", "ich", "bitten"],
				canonicalForm: "darf ich bitten",
				role: "Request",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"The free request complement is context between the classified fixed members.",
		},
		"grammar-de-discourse-formula-dev-dann-wollen-wir-mal": {
			input: discourseFormulaInput(
				"Nachdem alle ihre Werkzeuge bereitgelegt hatten, sagte der Meister: „<TARGET>Dann</TARGET> <TARGET>wollen</TARGET> <TARGET>wir</TARGET> <TARGET>mal</TARGET>.“",
			),
			idealOutput: citation({
				normalizedMembers: ["dann", "wollen", "wir", "mal"],
				canonicalForm: "dann wollen wir mal",
				role: "Initiation",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
		},
		"grammar-de-discourse-formula-dev-wie-dem-auch-sei": {
			input: discourseFormulaInput(
				"Nach dem Einwand und dem zitierten Spruch ‚Morgenstund hat Gold im Mund‘ beendete sie den Exkurs: „<TARGET>Wie</TARGET> <TARGET>dem</TARGET> <TARGET>auch</TARGET> <TARGET>sei</TARGET>, wir stimmen jetzt ab.“",
			),
			idealOutput: citation({
				normalizedMembers: ["wie", "dem", "auch", "sei"],
				canonicalForm: "wie dem auch sei",
				role: "Transition",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
			explanation:
				"The unmarked Proverb is contextual route contrast; the marked formula changes topic.",
		},
		"grammar-de-discourse-formula-dev-herzlich-willkommen": {
			input: discourseFormulaInput(
				"Die Museumsleiterin begrüßte die neue Gruppe mit „<TARGET>Herzlich</TARGET> <TARGET>willkommen</TARGET> in Leipzig!“",
			),
			idealOutput: citation({
				normalizedMembers: ["herzlich", "willkommen"],
				canonicalForm: "herzlich willkommen",
				role: "Greeting",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-dev-bitte-schoen-presentation": {
			input: discourseFormulaInput(
				"Der Kellner stellte die Tasse vor den Gast und sagte: „<TARGET>Bitte</TARGET> <TARGET>schön</TARGET>.“",
			),
			idealOutput: citation({
				normalizedMembers: ["bitte", "schön"],
				canonicalForm: "bitte schön",
				role: null,
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"The presentation function has no exact value in the role enum, so this Lemma identity has null role.",
		},
		"grammar-de-discourse-formula-dev-bitte-schoen-request": {
			input: discourseFormulaInput(
				"Am Schalter bestellte sie: „Zwei Fahrkarten nach Bonn, <TARGET>bitte</TARGET> <TARGET>schön</TARGET>.“",
			),
			idealOutput: citation({
				normalizedMembers: ["bitte", "schön"],
				canonicalForm: "bitte schön",
				role: "Request",
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"The order context establishes the Request identity of the same canonical wording.",
		},
		"grammar-de-discourse-formula-dev-tut-mir-leid-sympathy": {
			input: discourseFormulaInput(
				"Als sie vom Tod seines Hundes erfuhr, sagte sie leise: „<TARGET>Tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
			),
			idealOutput: citation({
				normalizedMembers: ["tut", "mir", "leid"],
				canonicalForm: "tut mir leid",
				role: null,
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"The speaker expresses sympathy rather than an apology; Sympathy has no role enum value.",
		},
		"grammar-de-discourse-formula-dev-herzlichen-glueckwunsch": {
			input: discourseFormulaInput(
				"Nach der bestandenen Prüfung sagte der Ausbilder: „<TARGET>Herzlichen</TARGET> <TARGET>Glückwunsch</TARGET>, Nina!“",
			),
			idealOutput: citation({
				normalizedMembers: ["herzlichen", "Glückwunsch"],
				canonicalForm: "herzlichen glückwunsch",
				role: null,
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"Congratulation is a supported interactional formula but is not represented by the role enum.",
		},
		"grammar-de-discourse-formula-dev-danke-danke-repetition": {
			input: discourseFormulaInput(
				"Als beide Kisten endlich oben standen, erwiderte der erleichterte Bewohner: „<TARGET>Danke</TARGET>, <TARGET>danke</TARGET> für die Hilfe!“",
			),
			idealOutput: citation({
				normalizedMembers: ["danke", "danke"],
				canonicalForm: "danke danke",
				role: "Thanks",
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"Both positions belong to one emphatically repeated, already-classified formula occurrence.",
		},
		"grammar-de-discourse-formula-accept-schoenen-guten-tag": {
			input: discourseFormulaInput(
				"An der Hotelrezeption wandte sich der Gast an die Mitarbeiterin: „<TARGET>Schönen</TARGET> <TARGET>guten</TARGET> <TARGET>Tag</TARGET>, Frau Özdemir.“",
			),
			idealOutput: citation({
				normalizedMembers: ["schönen", "guten", "Tag"],
				canonicalForm: "schönen guten tag",
				role: "Greeting",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-accept-gute-nacht": {
			input: discourseFormulaInput(
				"Vor dem Ausschalten des Flurlichts verabschiedete sich der Vater mit „<TARGET>Gute</TARGET> <TARGET>Nacht</TARGET>, ihr zwei.“",
			),
			idealOutput: citation({
				normalizedMembers: ["gute", "Nacht"],
				canonicalForm: "gute nacht",
				role: "Farewell",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-accept-besten-dank": {
			input: discourseFormulaInput(
				"Nachdem die Bibliothekarin das seltene Buch gefunden hatte, sagte der Forscher: „<TARGET>Besten</TARGET> <TARGET>Dank</TARGET> für Ihre Mühe.“",
			),
			idealOutput: citation({
				normalizedMembers: ["besten", "Dank"],
				canonicalForm: "besten dank",
				role: "Thanks",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-accept-ich-bitte-um-verzeihung": {
			input: discourseFormulaInput(
				"Nachdem sie den Termin verwechselt hatte, sagte die Ärztin: „<TARGET>Ich</TARGET> <TARGET>bitte</TARGET> <TARGET>um</TARGET> <TARGET>Verzeihung</TARGET> für die Wartezeit.“",
			),
			idealOutput: citation({
				normalizedMembers: ["ich", "bitte", "um", "Verzeihung"],
				canonicalForm: "ich bitte um verzeihung",
				role: "Apology",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
		},
		"grammar-de-discourse-formula-accept-keine-ursache": {
			input: discourseFormulaInput(
				"Auf sein dankbares Nicken antwortete der Hausmeister: „<TARGET>Keine</TARGET> <TARGET>Ursache</TARGET>, das mache ich gern.“",
			),
			idealOutput: citation({
				normalizedMembers: ["keine", "Ursache"],
				canonicalForm: "keine ursache",
				role: "Acknowledgment",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
