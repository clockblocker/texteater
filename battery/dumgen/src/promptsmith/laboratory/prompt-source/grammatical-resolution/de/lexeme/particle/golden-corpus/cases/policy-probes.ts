import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-part-provisional-affirmative-ja": {
			input: {
				markedContext:
					"Bezeichnung als affirmative Partikel: <TARGET>ja</TARGET>",
			},
			idealOutput: resolved("ja", {
				abbr: null,
				foreign: null,
				partType: null,
				polarity: "Pos",
			}),
			explanation:
				"Corpus-only policy probe: the codec permits Polarity=Pos, but current German UD documentation says that only Neg is used. Human review must decide whether an explicitly affirmative particle creates a German PART Lemma or remains an INTJ boundary.",
			contaminationKeys: ["de-part-policy:affirmative-ja"],
		},
		"grammar-de-part-provisional-foreign-not": {
			input: {
				markedContext: "Das ist <TARGET>not</TARGET> okay.",
			},
			idealOutput: resolved("not", {
				abbr: null,
				foreign: "Yes",
				partType: null,
				polarity: "Neg",
			}),
			explanation:
				"Corpus-only code-switch probe: German treebanks attest foreign negative particles, but the segmentation and lemma-language boundary needs human confirmation before this case is scored.",
			contaminationKeys: ["de-part-policy:foreign-not"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function resolved(
	form: string,
	coreFeatures: {
		readonly abbr: "Yes" | null;
		readonly foreign: "Yes" | null;
		readonly partType: "Inf" | null;
		readonly polarity: "Neg" | "Pos" | null;
	},
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: form,
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: { canonicalForm: form, coreFeatures },
		},
	};
}
