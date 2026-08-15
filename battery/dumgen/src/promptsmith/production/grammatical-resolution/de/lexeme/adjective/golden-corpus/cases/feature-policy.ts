import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase, unmarkedCore } from "./builders";

export const featurePolicyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-demo-ordinal-erste": inflectionCase(
			"Der <TARGET>erste</TARGET> Versuch gelang.",
			"erste",
			"erst",
			{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
			{
				coreFeatures: { ...unmarkedCore, numType: "Ord" },
				explanation: "Ordinal ADJ. Keep agreement. Lemma NumType Ord.",
			},
		),
		"grammar-de-adj-dev-cardinal-siebenhundert": inflectionCase(
			"Sie las die <TARGET>siebenhundert</TARGET> Seiten in einer Woche.",
			"siebenhundert",
			"siebenhundert",
			{ case: "Acc", degree: "Pos", gender: "Fem", number: "Plur" },
			{
				coreFeatures: { ...unmarkedCore, numType: "Card" },
				explanation:
					"Route fixed ADJ, not NUM. Cardinal identity. Invariant Surface.",
			},
		),
		"grammar-de-adj-dev-foreign-special": inflectionCase(
			"Das war ein <TARGET>special</TARGET> Moment für das Team.",
			"special",
			"special",
			{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
			{
				coreFeatures: { ...unmarkedCore, foreign: "Yes" },
				explanation:
					"Overt English adjective in German context. Mark Foreign Yes.",
			},
		),
		"grammar-de-adj-dev-abbreviation-sog": inflectionCase(
			"Ein <TARGET>sog</TARGET>. Experte sagte vor Gericht aus.",
			"sog",
			"sogenannt",
			{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
			{
				coreFeatures: { ...unmarkedCore, abbr: "Yes" },
				spelling: "Variant",
				explanation:
					"Licensed abbreviation. Period outside member. Variant Surface.",
			},
		),
		"grammar-de-adj-accept-ordinal-zweite": inflectionCase(
			"Die <TARGET>zweite</TARGET> Sitzung begann pünktlich.",
			"zweite",
			"zweit",
			{ case: "Nom", degree: "Pos", gender: "Fem", number: "Sing" },
			{
				coreFeatures: { ...unmarkedCore, numType: "Ord" },
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
