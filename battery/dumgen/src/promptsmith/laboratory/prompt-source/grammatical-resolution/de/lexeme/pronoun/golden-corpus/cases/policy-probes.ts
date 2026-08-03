import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, core, inflection, unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-pron-provisional-dem-rel-der": {
			input: {
				markedContext:
					"Der Mann, <TARGET>der</TARGET> hier wohnt, kommt.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only: GSD requires combined PronType=Dem,Rel, which the scalar codec cannot express.",
		},
		"grammar-de-pron-provisional-int-rel-wer": {
			input: { markedContext: "<TARGET>Wer</TARGET> kommt heute?" },
			idealOutput: unresolved,
			explanation:
				"Corpus-only: GSD requires combined PronType=Int,Rel, which the scalar codec cannot express.",
		},
		"grammar-de-pron-provisional-extpos-was": {
			input: { markedContext: "<TARGET>Was</TARGET> Neues gibt es?" },
			idealOutput: unresolved,
			explanation:
				"Corpus-only: GSD's ExtPos=DET occurrence also requires unrepresentable combined PronType.",
		},
		"grammar-de-pron-provisional-informal-polite-du": {
			input: { markedContext: "<TARGET>Du</TARGET> wartest hier." },
			idealOutput: inflection({
				normalizedSurface: "du",
				canonicalForm: "du",
				coreFeatures: core("Prs", { person: "2", polite: "Infm" }),
				inflectionalFeatures: {
					case: "Nom",
					gender: null,
					number: "Sing",
					reflex: null,
				},
			}),
			explanation:
				"Corpus-only: German UD prose specifies Infm, while current GSD data attests only Form.",
		},
		"grammar-de-pron-provisional-native-poss-meiner": {
			input: { markedContext: "Der Mantel ist <TARGET>meiner</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"Corpus-only: native PRON Poss identity is not established by the current GSD inventory.",
		},
		"grammar-de-pron-provisional-foreign-it": {
			input: { markedContext: "The answer is <TARGET>it</TARGET>." },
			idealOutput: citation({
				normalizedSurface: "it",
				canonicalForm: "it",
				coreFeatures: core("Prs", { foreign: "Yes", person: "3" }),
			}),
			explanation:
				"Corpus-only: establish whether a foreign code-switch token belongs on the German route.",
		},
		"grammar-de-pron-provisional-total-all": {
			input: { markedContext: "That's <TARGET>all</TARGET>." },
			idealOutput: citation({
				normalizedSurface: "all",
				canonicalForm: "all",
				coreFeatures: core("Tot", { foreign: "Yes" }),
			}),
			explanation:
				"Corpus-only: GSD's only PRON Tot token is foreign All, not a stable native German class.",
		},
		"grammar-de-pron-provisional-clitic-s": {
			input: {
				markedContext: "Wenn <TARGET>'s</TARGET> regnet, bleiben wir.",
			},
			idealOutput: inflection({
				normalizedSurface: "'s",
				canonicalForm: "es",
				coreFeatures: core("Prs", { person: "3" }),
				spelling: "Variant",
				inflectionalFeatures: {
					case: "Nom",
					gender: "Neut",
					number: "Sing",
					reflex: null,
				},
			}),
			explanation:
				"Corpus-only: Variant versus Partial treatment of the clitic requires a domain ruling.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
