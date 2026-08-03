import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-part-demo-unresolved-verb-particle-auf": {
			input: { markedContext: "Er hört <TARGET>auf</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"The separated prefix of aufhören is a verb particle. Universal Dependencies excludes German separable prefixes from PART, and Dumling exposes PartType=Vbp on the ADP codec instead.",
			contaminationKeys: ["de-part-boundary-form:auf"],
		},
		"grammar-de-part-demo-unresolved-response-nein": {
			input: {
				markedContext: "Kommst du mit? – <TARGET>Nein</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"A standalone answer is a response interjection, not the clause-dependent negative particle nicht.",
			contaminationKeys: ["de-part-boundary-form:nein"],
		},
		"grammar-de-part-unresolved-verb-particle-an": {
			input: { markedContext: "Der Zug kommt <TARGET>an</TARGET>." },
			idealOutput: unresolved,
			contaminationKeys: ["de-part-boundary-form:an"],
		},
		"grammar-de-part-unresolved-adverb-gerne": {
			input: {
				markedContext: "Wir helfen <TARGET>gerne</TARGET>.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-boundary-form:gerne"],
		},
		"grammar-de-part-unresolved-response-ja": {
			input: {
				markedContext: "Kommst du mit? – <TARGET>Ja</TARGET>.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-form:ja"],
		},
		"grammar-de-part-unresolved-cconj-aber": {
			input: {
				markedContext:
					"Sie ist müde, <TARGET>aber</TARGET> sie arbeitet weiter.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-boundary-form:aber"],
		},
		"grammar-de-part-unresolved-sconj-weil": {
			input: {
				markedContext: "Wir bleiben, <TARGET>weil</TARGET> es regnet.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-boundary-form:weil"],
		},
		"grammar-de-part-unresolved-phraseme-na-ja": {
			input: {
				markedContext: "Na <TARGET>ja</TARGET>, dann gehen wir eben.",
			},
			idealOutput: unresolved,
			explanation:
				"The marked ja belongs to the larger discourse formula na ja and must not be detached as a modal-particle Lexeme.",
			contaminationKeys: ["de-part-form:ja"],
		},
		"grammar-de-part-unresolved-adposition-zu": {
			input: {
				markedContext: "Wir fahren <TARGET>zu</TARGET> Maria.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-lemma:zu"],
		},
		"grammar-de-part-unresolved-overbroad-doch-mal": {
			input: { markedContext: "Komm <TARGET>doch mal</TARGET> mit!" },
			idealOutput: unresolved,
			contaminationKeys: ["de-part-overbroad:doch-mal"],
		},
		"grammar-de-part-unresolved-two-targets": {
			input: {
				markedContext:
					"Komm <TARGET>doch</TARGET> <TARGET>mal</TARGET> mit!",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-multiple-targets:doch-mal"],
		},
		"grammar-de-part-unresolved-ambiguous-doch-label": {
			input: {
				markedContext: "Stichwort ohne Kontext: <TARGET>doch</TARGET>",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-part-lemma:doch"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
