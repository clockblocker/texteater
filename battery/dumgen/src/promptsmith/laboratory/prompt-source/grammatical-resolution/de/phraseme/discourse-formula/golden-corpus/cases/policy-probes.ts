import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-discourse-formula-provisional-bitte-schoen-acknowledgment":
			{
				input: {
					markedContext:
						"Nachdem er um die Tasse gebeten hatte, reichte sie sie ihm und sagte: „<TARGET>Bitte</TARGET> <TARGET>schön</TARGET>.“",
				},
				idealOutput: citation({
					normalizedSurface: "bitte schön",
					canonicalForm: "bitte schön",
					role: "Acknowledgment",
					memberOrthographies: ["Standard", "Standard"],
				}),
				contaminationKeys: [
					"de-discourse-formula:bitte-schoen-polyfunction",
				],
				explanation:
					"Corpus-only scalar-role probe: the presentation responds to and acknowledges the prior request, but the enum has no dedicated presentation/offer role.",
			},
		"grammar-de-discourse-formula-provisional-bitte-schoen-request": {
			input: {
				markedContext:
					"Beim Bäcker sagte er: „Zwei Brötchen, <TARGET>bitte</TARGET> <TARGET>schön</TARGET>.“",
			},
			idealOutput: citation({
				normalizedSurface: "bitte schön",
				canonicalForm: "bitte schön",
				role: "Request",
				memberOrthographies: ["Standard", "Standard"],
			}),
			contaminationKeys: [
				"de-discourse-formula:bitte-schoen-polyfunction",
			],
			explanation:
				"Corpus-only scalar-role probe: the same formula enacts a request in this context rather than carrying a context-free role inventory.",
		},
		"grammar-de-discourse-formula-provisional-aphorism-zeit-ist-geld": {
			input: {
				markedContext:
					"Der Berater zitierte den Spruch: „<TARGET>Zeit</TARGET> <TARGET>ist</TARGET> <TARGET>Geld</TARGET>.“",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only boundary control: the maxim states a general proposition and belongs to Aphorism rather than DiscourseFormula.",
		},
		"grammar-de-discourse-formula-provisional-auf-keinen-fall-adverbial": {
			input: {
				markedContext:
					"Er wollte <TARGET>auf</TARGET> <TARGET>keinen</TARGET> <TARGET>Fall</TARGET> zu spät ankommen.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only route probe: here the sequence is embedded as an ordinary negative adverbial and does not independently enact a refusal.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
