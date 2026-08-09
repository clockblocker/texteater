import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-propn-typo-koelnn": {
			input: { markedContext: "Wir fahren nach <TARGET>Kölnn</TARGET>." },
			idealOutput: inflection({
				normalizedMembers: ["Köln"],
				case: "Dat",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
				memberOrthography: "Typo",
			}),
			explanation:
				"Repair only the duplicated final letter; the preposition establishes dative singular and the attested member is a Typo.",
			contaminationKeys: ["de-propn-orthography:typo"],
		},
		"grammar-de-propn-typo-muenchn": {
			input: { markedContext: "Wir wohnen in <TARGET>Münchn</TARGET>." },
			idealOutput: inflection({
				normalizedMembers: ["München"],
				case: "Dat",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
				memberOrthography: "Typo",
			}),
			explanation:
				"Repair the omitted e; this held-out repair is lemma-disjoint from the Kölnn demonstration.",
		},
		"grammar-de-propn-canonical-acronym-nato": {
			input: { markedContext: "<TARGET>NATO</TARGET> tagt heute." },
			idealOutput: inflection({
				normalizedMembers: ["NATO"],
				case: "Nom",
				number: "Sing",
				coreFeatures: {
					abbr: "Yes",
					foreign: null,
					gender: "Fem",
				},
			}),
			explanation:
				"Lexical evidence establishes NATO as an abbreviated feminine German proper-name identity; its foreign origin does not make the established German name Foreign. Preserve canonical all-caps spelling, while subject-verb agreement establishes nominative singular.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
