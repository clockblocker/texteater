import { defineGoldenCorpus } from "../../../../../assembly";
import { boundaryCases } from "./cases/boundaries";
import { robustnessCases } from "./cases/robustness";
import { routeCases } from "./cases/routes";
import { targetStimulusFingerprint } from "./fingerprints";
import { canonicalInputSchema, canonicalOutputSchema } from "./schemas";
import { assertCanonicalTargetClassificationCase } from "./validators";

export const corpus = defineGoldenCorpus({
	route: "target-classification/de/high-level-whole-unit",
	inputSchema: canonicalInputSchema,
	outputSchema: canonicalOutputSchema,
	collections: {
		routes: routeCases,
		boundaries: boundaryCases,
		robustness: robustnessCases,
	},
	fingerprintInput: targetStimulusFingerprint,
});

for (const [caseId, goldenCase] of Object.entries(corpus.cases)) {
	assertCanonicalTargetClassificationCase({ caseId, ...goldenCase });
}
