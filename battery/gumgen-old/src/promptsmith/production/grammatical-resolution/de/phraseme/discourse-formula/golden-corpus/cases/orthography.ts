import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, discourseFormulaInput } from "./builders";

export const orthographyAndCoverageCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-discourse-formula-demo-es-tut-mir-partial": {
				input: discourseFormulaInput(
					"In der abgebrochenen Sprachnachricht war nur die Entschuldigung „<TARGET>Es</TARGET> <TARGET>tut</TARGET> <TARGET>mir</TARGET> …“ zu hören.",
				),
				idealOutput: citation({
					normalizedMembers: ["es", "tut", "mir"],
					canonicalForm: "es tut mir leid",
					role: "Apology",
					memberOrthographies: ["Standard", "Standard", "Standard"],
					realizationCoverage: "Partial",
				}),
				explanation:
					"The ellipsis signals genuinely unrealized fixed material; every realized member is selected.",
			},
			"grammar-de-discourse-formula-dev-guten-morgen-casing-typo": {
				input: discourseFormulaInput(
					"Auf dem handgeschriebenen Schild stand die Begrüßung „<TARGET>Guten</TARGET> <TARGET>morgen</TARGET>“.",
				),
				idealOutput: citation({
					normalizedMembers: ["guten", "Morgen"],
					canonicalForm: "guten morgen",
					role: "Greeting",
					memberOrthographies: ["Standard", "Typo"],
				}),
				explanation:
					"The formula-initial adjective is ordinary contextual casing, while the lowercase noun is an actual casing error.",
			},
			"grammar-de-discourse-formula-dev-herzlich-wilkommen-typo": {
				input: discourseFormulaInput(
					"Die Gastgeberin öffnete die Tür und sagte: „<TARGET>Herzlich</TARGET> <TARGET>wilkommen</TARGET> in unserer Runde!“",
				),
				idealOutput: citation({
					normalizedMembers: ["herzlich", "willkommen"],
					canonicalForm: "herzlich willkommen",
					role: "Greeting",
					memberOrthographies: ["Standard", "Typo"],
				}),
				explanation:
					"The missing second l is repaired only in the selected misspelled member.",
			},
			"grammar-de-discourse-formula-dev-auf-wiedersehn-variant": {
				input: discourseFormulaInput(
					"Am Gartentor verabschiedete sich der Besucher mit „<TARGET>Auf</TARGET> <TARGET>Wiedersehn</TARGET>!“",
				),
				idealOutput: citation({
					normalizedMembers: ["auf", "Wiedersehn"],
					canonicalForm: "auf wiedersehen",
					role: "Farewell",
					memberOrthographies: ["Standard", "Standard"],
					spelling: "Variant",
				}),
				explanation:
					"The licensed contracted spelling is preserved on the Surface and maps to the current full Lemma wording.",
			},
			"grammar-de-discourse-formula-dev-gott-befohlen-archaic": {
				input: discourseFormulaInput(
					"Im historischen Bühnenstück verabschiedete sich der Wanderer mit „<TARGET>Gott</TARGET> <TARGET>befohlen</TARGET>!“",
				),
				idealOutput: citation({
					normalizedMembers: ["Gott", "befohlen"],
					canonicalForm: "gott befohlen",
					role: "Farewell",
					memberOrthographies: ["Standard", "Standard"],
					historical: true,
				}),
				explanation:
					"The formula's discourse use is archaic, while its attested spelling is canonical.",
			},
			"grammar-de-discourse-formula-dev-mit-freundlichen-partial": {
				input: discourseFormulaInput(
					"Der beschädigte Briefentwurf endete sichtbar mit „<TARGET>Mit</TARGET> <TARGET>freundlichen</TARGET> …“.",
				),
				idealOutput: citation({
					normalizedMembers: ["mit", "freundlichen"],
					canonicalForm: "mit freundlichen grüßen",
					role: "Farewell",
					memberOrthographies: ["Standard", "Standard"],
					realizationCoverage: "Partial",
				}),
				explanation:
					"The visible ellipsis marks an unrealized tail; it is not an omitted present member.",
			},
			"grammar-de-discourse-formula-accept-vielen-herzlichen-partial": {
				input: discourseFormulaInput(
					"Die Aufnahme brach mitten in der Dankesformel „<TARGET>Vielen</TARGET> <TARGET>herzlichen</TARGET> …“ ab.",
				),
				idealOutput: citation({
					normalizedMembers: ["vielen", "herzlichen"],
					canonicalForm: "vielen herzlichen dank",
					role: "Thanks",
					memberOrthographies: ["Standard", "Standard"],
					realizationCoverage: "Partial",
				}),
				explanation:
					"The recording contains only the recoverable beginning, so missing Dank is genuinely unrealized.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
