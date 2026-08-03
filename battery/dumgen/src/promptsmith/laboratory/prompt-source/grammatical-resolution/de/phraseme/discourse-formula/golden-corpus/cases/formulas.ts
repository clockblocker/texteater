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
					"Nach dem Missgeschick sagte er: „<TARGET>Tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "tut mir leid",
				canonicalForm: "tut mir leid",
				role: "Apology",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"In this repair context Tut mir leid directly performs an apology rather than merely describing regret.",
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
		"grammar-de-discourse-formula-auf-keinen-fall": {
			input: {
				markedContext:
					"„Kommst du mit?“ – „<TARGET>Auf</TARGET> <TARGET>keinen</TARGET> <TARGET>Fall</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "auf keinen Fall",
				canonicalForm: "auf keinen fall",
				role: "Refusal",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
		},
		"grammar-de-discourse-formula-auf-jeden-fall": {
			input: {
				markedContext:
					"„Schaffst du es bis morgen?“ – „<TARGET>Auf</TARGET> <TARGET>jeden</TARGET> <TARGET>Fall</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "auf jeden Fall",
				canonicalForm: "auf jeden fall",
				role: "Reaction",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
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
