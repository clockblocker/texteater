import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const coreFeaturesAndOrthographyCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-cconj-demo-comparative-als": {
				input: {
					markedContext:
						"Mira ist größer <TARGET>als</TARGET> ihre Schwester.",
				},
				idealOutput: resolved("als", {
					conjType: "Comp",
				}),
				explanation:
					"The comparative conjunction als carries the only marked German CCONJ Core Feature, ConjType=Comp.",
			},
			"grammar-de-cconj-comparative-wie": {
				input: {
					markedContext:
						"Mira ist so groß <TARGET>wie</TARGET> ihre Schwester.",
				},
				idealOutput: resolved("wie", { conjType: "Comp" }),
			},
			"grammar-de-cconj-comparative-als-held-out": {
				input: {
					markedContext:
						"Der Turm ist höher <TARGET>als</TARGET> das Rathaus.",
				},
				idealOutput: resolved("als", { conjType: "Comp" }),
			},
			"grammar-de-cconj-demo-typo-udn": {
				input: {
					markedContext:
						"Tee <TARGET>udn</TARGET> Kaffee stehen bereit.",
				},
				idealOutput: resolved("und", { conjType: null }, "Typo"),
				explanation:
					"Repair the transposition only in normalizedSurface and canonicalForm; the marked member is a Typo.",
			},
			"grammar-de-cconj-typo-odre": {
				input: {
					markedContext:
						"Nimm den Bus <TARGET>odre</TARGET> geh zu Fuß.",
				},
				idealOutput: resolved("oder", { conjType: null }, "Typo"),
			},
			"grammar-de-cconj-demo-variant-bzw": {
				input: {
					markedContext:
						"Die Eltern <TARGET>bzw.</TARGET> Sorgeberechtigten unterschreiben.",
				},
				idealOutput: resolved(
					"bzw.",
					{ conjType: null },
					"Standard",
					"beziehungsweise",
					"Variant",
				),
				explanation:
					"The licensed abbreviation is Standard attestation of a Variant Surface; normalization must not expand it to the Lemma's canonicalForm.",
			},
			"grammar-de-cconj-provisional-archaic-allein": {
				input: {
					markedContext:
						"Ich wollte helfen, <TARGET>allein</TARGET> mir fehlte die Zeit.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						surface: {
							normalizedSurface: "allein",
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: {
								historicalStatus: "Archaic",
							},
						},
						lemma: {
							canonicalForm: "allein",
							coreFeatures: { conjType: null },
						},
					},
				},
				explanation:
					"Corpus-only policy probe: the adversative conjunction allein is identifiable, while its historical-status boundary needs human confirmation before scoring.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);

function resolved(
	normalizedSurface: string,
	coreFeatures: { readonly conjType: "Comp" | null },
	orthography: "Standard" | "Typo" = "Standard",
	canonicalForm = normalizedSurface,
	spelling: "Canonical" | "Variant" = "Canonical",
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [orthography],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface,
				spelling,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: { canonicalForm, coreFeatures },
		},
	};
}
