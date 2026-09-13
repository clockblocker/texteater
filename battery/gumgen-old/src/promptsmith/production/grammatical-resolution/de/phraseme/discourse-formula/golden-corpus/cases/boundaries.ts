import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, discourseFormulaInput } from "./builders";

export const contextualContrastCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-discourse-formula-dev-gute-reise-wish": {
				input: discourseFormulaInput(
					"Nachdem sie über eine gute Reise im nächsten Jahr gesprochen hatten, wünschte Karim seiner Schwester am Bahnsteig: „<TARGET>Gute</TARGET> <TARGET>Reise</TARGET>, Leyla!“",
				),
				idealOutput: citation({
					normalizedMembers: ["gute", "Reise"],
					canonicalForm: "gute reise",
					role: null,
					memberOrthographies: ["Standard", "Standard"],
				}),
				explanation:
					"The marked occurrence enacts a wish; the earlier same-word noun phrase and the vocative remain context, and Wish has no role enum value.",
			},
			"grammar-de-discourse-formula-accept-auf-keinen-fall": {
				input: discourseFormulaInput(
					"„Gibst du ihm das Original ohne Quittung?“ – „<TARGET>Auf</TARGET> <TARGET>keinen</TARGET> <TARGET>Fall</TARGET>.“",
				),
				idealOutput: citation({
					normalizedMembers: ["auf", "keinen", "Fall"],
					canonicalForm: "auf keinen fall",
					role: "Refusal",
					memberOrthographies: ["Standard", "Standard", "Standard"],
				}),
				explanation:
					"The standalone reply performs a refusal rather than serving as an embedded adverbial.",
			},
			"grammar-de-discourse-formula-accept-nun-denn": {
				input: discourseFormulaInput(
					"Als alle Plätze besetzt waren, eröffnete die Moderatorin die Sitzung mit „<TARGET>Nun</TARGET> <TARGET>denn</TARGET>, beginnen wir.“",
				),
				idealOutput: citation({
					normalizedMembers: ["nun", "denn"],
					canonicalForm: "nun denn",
					role: "Initiation",
					memberOrthographies: ["Standard", "Standard"],
				}),
			},
			"grammar-de-discourse-formula-accept-um-himmels-willen": {
				input: discourseFormulaInput(
					"Nachdem jemand den Idiom-Ausdruck ‚ins Gras beißen‘ erwähnt hatte, sah die Ärztin den falschen Befund und rief: „<TARGET>Um</TARGET> <TARGET>Himmels</TARGET> <TARGET>willen</TARGET>!“",
				),
				idealOutput: citation({
					normalizedMembers: ["um", "Himmels", "willen"],
					canonicalForm: "um himmels willen",
					role: "Reaction",
					memberOrthographies: ["Standard", "Standard", "Standard"],
				}),
				explanation:
					"The unmarked Idiom mention is route-contrast context; the marked reaction formula is authoritative.",
			},
			"grammar-de-discourse-formula-accept-willkommen-single": {
				input: discourseFormulaInput(
					"Nach dem lockeren Zuruf ‚Hallo!‘ trat die Gastgeberin ans Mikrofon und begrüßte die Gäste offiziell: „<TARGET>Willkommen</TARGET> in Dresden!“",
				),
				idealOutput: citation({
					normalizedMembers: ["willkommen"],
					canonicalForm: "willkommen",
					role: "Greeting",
					memberOrthographies: ["Standard"],
				}),
				explanation:
					"A valid single-member formula is resolved on this authoritative route; the nearby unmarked Interjection does not alter membership.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
