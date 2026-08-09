import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adv-demo-unresolved-adverbial-adjective": {
			input: {
				markedContext: "Der Hund läuft <TARGET>schnell</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Productive adverbial use does not change the adjective Lexeme schnell into a lexical ADV; keep it on its ADJ route.",
		},
		"grammar-de-adv-unresolved-attributive-adjective": {
			input: {
				markedContext: "Sie nimmt den <TARGET>schnellen</TARGET> Zug.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adv-unresolved-modal-particle-doch": {
			input: {
				markedContext: "Komm <TARGET>doch</TARGET> morgen vorbei.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adv-unresolved-subordinating-conjunction": {
			input: {
				markedContext:
					"Wir bleiben zu Hause, <TARGET>weil</TARGET> es regnet.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adv-unresolved-overbroad-target": {
			input: {
				markedContext: "Sie besucht uns <TARGET>sehr oft</TARGET>.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adv-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"<TARGET>Heute</TARGET> arbeitet sie, <TARGET>morgen</TARGET> ruht sie sich aus.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adv-provisional-split-pronominal-dafuer": {
			input: {
				markedContext:
					"Da kann ich <TARGET>da</TARGET> nichts <TARGET>für</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard", "Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["da", "für"],
					surface: {
						spelling: "Variant",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "dafür",
						coreFeatures: {
							foreign: null,
							numType: null,
							pronType: "Dem",
						},
					},
				},
			},
			explanation:
				"Corpus-only probe: colloquial split pronominal adverbs need a settled Surface normalization and route-membership policy.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
