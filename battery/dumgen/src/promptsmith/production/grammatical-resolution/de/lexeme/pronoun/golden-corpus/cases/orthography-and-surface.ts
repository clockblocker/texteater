import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, core, inflectionCase } from "./builders";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-demo-variant-nix": citationCase(
				"Nach dem Gewitter war im Keller <TARGET>nix</TARGET> mehr trocken.",
				"nix",
				"nichts",
				{
					spelling: "Variant",
					coreFeatures: core("Neg"),
					explanation: "Licensed colloquial form. Not Typo.",
				},
			),
			"grammar-de-pron-dev-contraction-s": inflectionCase(
				"Wenn '<TARGET>s</TARGET> morgen regnet, bleibt das Turnier in der Halle.",
				"s",
				"es",
				{ case: "Nom", gender: "Neut", number: "Sing", reflex: null },
				{
					spelling: "Variant",
					coreFeatures: core("Prs", { person: "3" }),
					explanation:
						"Apostrophe outside member. Contracted es remains full.",
				},
			),
			"grammar-de-pron-dev-typo-ihc": inflectionCase(
				"Nach der Sitzung fahre <TARGET>ihc</TARGET> direkt nach Hause.",
				"ihc",
				"ich",
				{ case: "Nom", gender: null, number: "Sing", reflex: null },
				{
					normalizedMember: "ich",
					orthography: "Typo",
					coreFeatures: core("Prs", { person: "1" }),
				},
			),
			"grammar-de-pron-dev-archaic-euer": inflectionCase(
				"<TARGET>Euer</TARGET> gedenke ich in dieser schweren Stunde.",
				"Euer",
				"ihr",
				{ case: "Gen", gender: null, number: "Plur", reflex: null },
				{
					normalizedMember: "euer",
					historicalStatus: "Archaic",
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
					}),
					explanation:
						"Old genitive use. Initial capital is Standard.",
				},
			),
			"grammar-de-pron-dev-formal-lowercase-typo": inflectionCase(
				"Frau Doktor, bitte setzen <TARGET>sie</TARGET> sich an den Tisch.",
				"sie",
				"Sie",
				{ case: "Nom", gender: null, number: null, reflex: null },
				{
					normalizedMember: "Sie",
					orthography: "Typo",
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
					}),
					explanation: "Formal address needs capital S.",
				},
			),
			"grammar-de-pron-accept-v4-foreign-he": inflectionCase(
				"Im englischen Protokoll heißt es: „<TARGET>He</TARGET> signed the form.“",
				"He",
				"he",
				{ case: "Nom", gender: "Masc", number: "Sing", reflex: null },
				{
					normalizedMember: "he",
					coreFeatures: core("Prs", {
						foreign: "Yes",
						person: "3",
					}),
					explanation: "English code-switch PRON. Foreign Yes.",
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
