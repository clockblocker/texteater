import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "grammar-noun-test-plural",
		input: { markedContext: "Die <TARGET>Banken</TARGET>" },
		idealOutput: {
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard"],
				surface: {
					normalizedSurface: "Banken",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Nom", number: "Plur" },
				},
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
			},
		},
	},
	{
		id: "grammar-noun-use-typo-repaired-on-surface",
		input: { markedContext: "Der <TARGET>Kaffe</TARGET> duftet." },
		idealOutput: {
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Typo"],
				surface: {
					normalizedSurface: "Kaffee",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Nom", number: "Sing" },
				},
				lemma: {
					canonicalForm: "Kaffee",
					coreFeatures: { gender: "Masc", hyph: null },
				},
			},
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
