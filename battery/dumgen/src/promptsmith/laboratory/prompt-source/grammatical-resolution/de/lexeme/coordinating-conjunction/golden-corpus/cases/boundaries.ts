import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-cconj-demo-ambiguous-doch": {
			input: {
				markedContext: "Stichwort ohne Kontext: <TARGET>doch</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"Without syntax, doch does not distinguish its coordinating-conjunction use from its particle or adverb uses.",
		},
		"grammar-de-cconj-unresolved-ambiguous-denn": {
			input: {
				markedContext: "Stichwort ohne Kontext: <TARGET>denn</TARGET>",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-subordinator-weil": {
			input: {
				markedContext: "Wir bleiben, <TARGET>weil</TARGET> es regnet.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-overbroad-und-kaffee": {
			input: {
				markedContext: "Tee <TARGET>und Kaffee</TARGET> stehen bereit.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-two-targets": {
			input: {
				markedContext:
					"Tee <TARGET>und</TARGET> Kaffee <TARGET>oder</TARGET> Wasser stehen bereit.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-particle-aber": {
			input: {
				markedContext: "Das ist <TARGET>aber</TARGET> schön!",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-particle-doch": {
			input: {
				markedContext: "Komm <TARGET>doch</TARGET> mit!",
			},
			idealOutput: unresolved,
		},
		"grammar-de-cconj-unresolved-adverb-jedoch": {
			input: {
				markedContext:
					"Sie wollte <TARGET>jedoch</TARGET> nicht warten.",
			},
			idealOutput: unresolved,
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
