import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "grammar-noun-use-dative-feminine",
		input: {
			markedContext: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
		},
		idealOutput: {
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard"],
				surface: {
					normalizedSurface: "Bibliothek",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Dat", number: "Sing" },
				},
				lemma: {
					canonicalForm: "Bibliothek",
					coreFeatures: { gender: "Fem", hyph: null },
				},
			},
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
