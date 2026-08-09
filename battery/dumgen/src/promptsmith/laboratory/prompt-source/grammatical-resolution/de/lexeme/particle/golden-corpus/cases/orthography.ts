import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const nullCore = {
	abbr: null,
	foreign: null,
	partType: null,
	polarity: null,
} as const;

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-part-demo-typo-ebn": {
			input: {
				markedContext: "Das ist <TARGET>ebn</TARGET> so.",
			},
			idealOutput: resolvedTypo("eben"),
			explanation:
				"Repair the omitted e in the normalized Surface and Lemma, and record the marked member as Typo; the modal-particle Core Features remain null.",
			contaminationKeys: ["de-part-lemma:eben"],
		},
		"grammar-de-part-negative-typo-nicth": {
			input: {
				markedContext: "Das stimmt <TARGET>nicth</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Typo"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "nicht",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "nicht",
						coreFeatures: { ...nullCore, polarity: "Neg" },
					},
				},
			},
			contaminationKeys: ["de-part-lemma:nicht"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function resolvedTypo(canonicalForm: string) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Typo" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: canonicalForm,
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: { canonicalForm, coreFeatures: nullCore },
		},
	};
}
