import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "grammar-noun-test-plural",
		input: { markedContext: "Die <TARGET>Banken</TARGET>" },
		idealOutput: {
			decision: "Resolved",
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
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
