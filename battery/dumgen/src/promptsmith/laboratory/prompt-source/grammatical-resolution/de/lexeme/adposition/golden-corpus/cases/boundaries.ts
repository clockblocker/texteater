import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adp-demo-unresolved-overbroad-mit": {
			input: {
				markedContext:
					"Mara schneidet das Brot <TARGET>mit einem Messer</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The TARGET contains the complement; only lexical material of the adposition belongs to this route.",
		},
		"grammar-de-adp-demo-unresolved-ambiguous-entlang": {
			input: {
				markedContext:
					"Stichwort ohne Kontext: <TARGET>entlang</TARGET>",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"Without context, entlang does not establish one prepositional or postpositional Core Feature analysis and governed case.",
		},
		"grammar-de-adp-unresolved-sconj-weil": {
			input: {
				markedContext:
					"Wir bleiben drinnen, <TARGET>weil</TARGET> es regnet.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-adp-unresolved-verb-particle-auf": {
			input: {
				markedContext: "Sie steht früh <TARGET>auf</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The marked material is the separated member of aufstehen, not an independently governed ADP target.",
		},
		"grammar-de-adp-unresolved-fusion-im": {
			input: {
				markedContext: "Das Buch liegt <TARGET>im</TARGET> Regal.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"im fuses preposition and article and must not be flattened into the fixed Lexeme/ADP route.",
		},
		"grammar-de-adp-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"Sie kam <TARGET>mit</TARGET> Jacke, aber <TARGET>ohne</TARGET> Schal.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-adp-unresolved-target-includes-adverb": {
			input: {
				markedContext:
					"Der Weg führt <TARGET>direkt durch</TARGET> den Wald.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-adp-unresolved-adjective-route": {
			input: {
				markedContext: "Der Weg ist <TARGET>lang</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
