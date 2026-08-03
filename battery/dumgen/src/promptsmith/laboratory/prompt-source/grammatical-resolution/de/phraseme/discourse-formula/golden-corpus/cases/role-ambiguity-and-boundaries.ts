import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, unresolved } from "./builders";

export const roleAmbiguityAndBoundaryCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-discourse-formula-auf-jeden-fall-affirmative-role-gap":
				{
					input: {
						markedContext:
							"„Schaffst du es bis morgen?“ – „<TARGET>Auf</TARGET> <TARGET>jeden</TARGET> <TARGET>Fall</TARGET>.“",
					},
					idealOutput: citation({
						normalizedSurface: "auf jeden Fall",
						canonicalForm: "auf jeden fall",
						role: null,
						memberOrthographies: [
							"Standard",
							"Standard",
							"Standard",
						],
					}),
					explanation:
						"The standalone reply expresses emphatic certainty or affirmation. Because the enum has no Affirmation or Confirmation role and Reaction is not grammatically established by the expression, this is the null-role Lemma identity.",
				},
			"grammar-de-discourse-formula-bitte-schoen-presentation-role-gap": {
				input: {
					markedContext:
						"Nachdem er um die Tasse gebeten hatte, reichte sie sie ihm und sagte: „<TARGET>Bitte</TARGET> <TARGET>schön</TARGET>.“",
				},
				idealOutput: citation({
					normalizedSurface: "bitte schön",
					canonicalForm: "bitte schön",
					role: null,
					memberOrthographies: ["Standard", "Standard"],
				}),
				contaminationKeys: [
					"de-discourse-formula:bitte-schoen-role-identity",
				],
				explanation:
					"The presentation formula is identifiable, but none of the ten enum roles grammatically names its offering/presentation function, so it has the distinct null-role Lemma identity.",
			},
			"grammar-de-discourse-formula-bitte-schoen-request-role-identity": {
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
					"de-discourse-formula:bitte-schoen-role-identity",
				],
				explanation:
					"The order context supports the Request grammatical Lemma identity, distinct from the same-form null-role presentation identity.",
			},
			"grammar-de-discourse-formula-tut-mir-leid-sympathy-role-gap": {
				input: {
					markedContext:
						"Als sie vom Tod seines Bruders erfuhr, sagte sie: „<TARGET>Tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
				},
				idealOutput: citation({
					normalizedSurface: "tut mir leid",
					canonicalForm: "tut mir leid",
					role: null,
					memberOrthographies: ["Standard", "Standard", "Standard"],
				}),
				contaminationKeys: [
					"de-discourse-formula:tut-mir-leid-role-identity",
				],
				explanation:
					"The speaker did not cause the harm and expresses sympathy rather than apologizing. The formula is identifiable, but Sympathy is absent from the enum, so this is the null-role Lemma identity.",
			},
			"grammar-de-discourse-formula-auf-keinen-fall-adverbial-boundary": {
				input: {
					markedContext:
						"Er wollte <TARGET>auf</TARGET> <TARGET>keinen</TARGET> <TARGET>Fall</TARGET> zu spät ankommen.",
				},
				idealOutput: unresolved,
				explanation:
					"Here the sequence is embedded as an ordinary negative adverbial and does not independently enact a refusal.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
