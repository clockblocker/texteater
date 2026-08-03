import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation } from "./builders";

export const formulaCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-discourse-formula-guten-morgen": {
			input: {
				markedContext:
					"Als sie das Büro betrat, sagte sie: „<TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>!“",
			},
			idealOutput: citation({
				normalizedSurface: "guten Morgen",
				canonicalForm: "guten morgen",
				role: "Greeting",
				memberOrthographies: ["Standard", "Standard"],
			}),
			contaminationKeys: [
				"de-discourse-formula:orthography-guten-morgen",
			],
			explanation:
				"Guten Morgen conventionally performs a greeting; quotation-initial capitalization is Standard while the noun remains capitalized on the Surface.",
		},
		"grammar-de-discourse-formula-tut-mir-leid": {
			input: {
				markedContext:
					"Nachdem er ihr Fahrrad beschädigt hatte, entschuldigte er sich ausdrücklich: „<TARGET>Tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>, dass ich dein Fahrrad beschädigt habe.“",
			},
			idealOutput: citation({
				normalizedSurface: "tut mir leid",
				canonicalForm: "tut mir leid",
				role: "Apology",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			contaminationKeys: [
				"de-discourse-formula:tut-mir-leid-role-identity",
			],
			explanation:
				"The speaker caused the harm and explicitly apologizes for it, establishing the Apology grammatical Lemma identity rather than sympathy or regret.",
		},
		"grammar-de-discourse-formula-wie-dem-auch-sei": {
			input: {
				markedContext:
					"Sie brach die Debatte ab: „<TARGET>Wie</TARGET> <TARGET>dem</TARGET> <TARGET>auch</TARGET> <TARGET>sei</TARGET>, wir fahren fort.“",
			},
			idealOutput: citation({
				normalizedSurface: "wie dem auch sei",
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
				"The conventional formula closes the preceding line of discussion and transitions to the next one.",
		},
		"grammar-de-discourse-formula-auf-wiedersehen": {
			input: {
				markedContext:
					"Zum Abschied sagte sie: „<TARGET>Auf</TARGET> <TARGET>Wiedersehen</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "auf Wiedersehen",
				canonicalForm: "auf wiedersehen",
				role: "Farewell",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-vielen-dank": {
			input: {
				markedContext:
					"Sie nahm das Paket entgegen und sagte: „<TARGET>Vielen</TARGET> <TARGET>Dank</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "vielen Dank",
				canonicalForm: "vielen dank",
				role: "Thanks",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-gern-geschehen": {
			input: {
				markedContext:
					"Auf seinen Dank antwortete sie: „<TARGET>Gern</TARGET> <TARGET>geschehen</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "gern geschehen",
				canonicalForm: "gern geschehen",
				role: "Acknowledgment",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-nein-danke": {
			input: {
				markedContext:
					"„Möchten Sie mitfahren?“ – „<TARGET>Nein</TARGET> <TARGET>danke</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "nein danke",
				canonicalForm: "nein danke",
				role: "Refusal",
				memberOrthographies: ["Standard", "Standard"],
			}),
			explanation:
				"The conventional politeness formula directly refuses the offered ride.",
		},
		"grammar-de-discourse-formula-ach-du-meine-guete": {
			input: {
				markedContext:
					"Als der Schrank plötzlich umstürzte, rief sie: „<TARGET>Ach</TARGET> <TARGET>du</TARGET> <TARGET>meine</TARGET> <TARGET>Güte</TARGET>!“",
			},
			idealOutput: citation({
				normalizedSurface: "ach du meine Güte",
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
				"The conventional exclamation directly reacts with fright and surprise to the sudden event.",
		},
		"grammar-de-discourse-formula-darf-ich-bitten": {
			input: {
				markedContext:
					"Er verbeugte sich vor der Tänzerin: „<TARGET>Darf</TARGET> <TARGET>ich</TARGET> <TARGET>bitten</TARGET>?“",
			},
			idealOutput: citation({
				normalizedSurface: "darf ich bitten",
				canonicalForm: "darf ich bitten",
				role: "Request",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-dann-wollen-wir-mal": {
			input: {
				markedContext:
					"Als alle bereit waren, sagte sie: „<TARGET>Dann</TARGET> <TARGET>wollen</TARGET> <TARGET>wir</TARGET> <TARGET>mal</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "dann wollen wir mal",
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
		"grammar-de-discourse-formula-bis-bald": {
			input: {
				markedContext:
					"An der Tür verabschiedete er sich: „<TARGET>Bis</TARGET> <TARGET>bald</TARGET>!“",
			},
			idealOutput: citation({
				normalizedSurface: "bis bald",
				canonicalForm: "bis bald",
				role: "Farewell",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-besten-dank": {
			input: {
				markedContext:
					"Nach der Auskunft sagte er: „<TARGET>Besten</TARGET> <TARGET>Dank</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "besten Dank",
				canonicalForm: "besten dank",
				role: "Thanks",
				memberOrthographies: ["Standard", "Standard"],
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
