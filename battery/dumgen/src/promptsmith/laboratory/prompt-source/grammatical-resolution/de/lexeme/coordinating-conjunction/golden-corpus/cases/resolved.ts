import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-cconj-demo-contextual-und-citation": {
			input: {
				markedContext: "Anna liest <TARGET>und</TARGET> Ben kocht.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					surface: {
						normalizedSurface: "und",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "und",
						coreFeatures: { conjType: null },
					},
				},
			},
			explanation:
				"CCONJ has no Dumling Inflection Surface, so an ordinary contextual use still resolves to Citation with no comparative Core Feature.",
		},
		"grammar-de-cconj-citation-oder": {
			input: {
				markedContext: "Wörterbucheintrag: <TARGET>oder</TARGET>",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					surface: {
						normalizedSurface: "oder",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "oder",
						coreFeatures: { conjType: null },
					},
				},
			},
		},
		"grammar-de-cconj-und-noun-phrases": {
			input: {
				markedContext: "Tee <TARGET>und</TARGET> Kaffee stehen bereit.",
			},
			idealOutput: resolved("und"),
		},
		"grammar-de-cconj-oder-clauses": {
			input: {
				markedContext:
					"Wir fahren heute, <TARGET>oder</TARGET> wir bleiben zu Hause.",
			},
			idealOutput: resolved("oder"),
		},
		"grammar-de-cconj-aber-clauses": {
			input: {
				markedContext:
					"Sie ist müde, <TARGET>aber</TARGET> sie arbeitet weiter.",
			},
			idealOutput: resolved("aber"),
		},
		"grammar-de-cconj-denn-clauses": {
			input: {
				markedContext: "Wir gehen, <TARGET>denn</TARGET> es wird spät.",
			},
			idealOutput: resolved("denn"),
		},
		"grammar-de-cconj-coordinating-doch": {
			input: {
				markedContext:
					"Er wollte kommen, <TARGET>doch</TARGET> er wurde krank.",
			},
			idealOutput: resolved("doch"),
		},
		"grammar-de-cconj-sondern-adjectives": {
			input: {
				markedContext:
					"Das Wasser ist nicht kalt, <TARGET>sondern</TARGET> warm.",
			},
			idealOutput: resolved("sondern"),
		},
		"grammar-de-cconj-sowie-noun-phrases": {
			input: {
				markedContext:
					"Brot <TARGET>sowie</TARGET> Käse werden serviert.",
			},
			idealOutput: resolved("sowie"),
		},
		"grammar-de-cconj-correlative-noch": {
			input: {
				markedContext:
					"Sie trinkt weder Tee <TARGET>noch</TARGET> Kaffee.",
			},
			idealOutput: resolved("noch"),
		},
		"grammar-de-cconj-repeated-second-und": {
			input: {
				markedContext:
					"Anna und Ben singen <TARGET>und</TARGET> Carla tanzt.",
			},
			idealOutput: resolved("und"),
		},
		"grammar-de-cconj-sentence-initial-und": {
			input: {
				markedContext:
					"<TARGET>Und</TARGET> dann gingen wir nach Hause.",
			},
			idealOutput: resolved("und"),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function resolved(
	normalizedSurface: string,
	canonicalForm = normalizedSurface,
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			surface: {
				normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm,
				coreFeatures: { conjType: null },
			},
		},
	};
}
