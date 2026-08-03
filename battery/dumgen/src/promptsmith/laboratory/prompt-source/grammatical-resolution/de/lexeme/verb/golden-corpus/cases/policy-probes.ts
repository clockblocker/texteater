import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finite, inflection, ordinaryCore, unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-provisional-passive-participle-geschlossen": {
			input: {
				markedContext: "Die Tür wurde <TARGET>geschlossen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "geschlossen",
				canonicalForm: "schließen",
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: "Pass",
				},
			}),
			explanation:
				"Probe whether contextual passive voice belongs on the lexical participle or only on the whole periphrastic complex.",
		},
		"grammar-de-verb-provisional-predicative-geschlossen": {
			input: {
				markedContext: "Die Tür ist <TARGET>geschlossen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "geschlossen",
				canonicalForm: "schließen",
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: null,
				},
			}),
			explanation:
				"Probe the boundary between a predicative bare participle and a lexicalized adjective reading.",
		},
		"grammar-de-verb-provisional-modal-ellipsis-kann": {
			input: { markedContext: "Sie <TARGET>kann</TARGET> Deutsch." },
			idealOutput: finite(
				"kann",
				"können",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, verbType: "Mod" },
			),
			explanation:
				"Probe whether an elided lexical predicate preserves modal identity on VERB or remains AUX.",
		},
		"grammar-de-verb-provisional-zu-infinitive-warten": {
			input: {
				markedContext: "Sie versucht zu <TARGET>warten</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "warten",
				canonicalForm: "warten",
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
		},
		"grammar-de-verb-provisional-nominalized-infinitive": {
			input: {
				markedContext: "Das <TARGET>Schwimmen</TARGET> macht Spaß.",
			},
			idealOutput: unresolved,
			explanation:
				"Probe productive nominalization at the NOUN/VERB boundary.",
		},
		"grammar-de-verb-provisional-split-stem-only": {
			input: { markedContext: "Sie <TARGET>hört</TARGET> sofort auf." },
			idealOutput: unresolved,
			explanation:
				"The target omits the detached prefix; the complete-surface requirement should reject it.",
			contaminationKeys: ["de-verb-boundary:incomplete-separable"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
