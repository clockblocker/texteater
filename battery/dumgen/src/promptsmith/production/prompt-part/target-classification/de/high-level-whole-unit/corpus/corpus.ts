import { defineGoldenCorpus } from "../../../../../../assembly";
import { adaptiveDevelopmentCases } from "./cases/adaptive-development";
import { boundaryCases } from "./cases/boundaries";
import {
	participleBenchmarkCases,
	participleBenchmarkPairs,
} from "./cases/participle-benchmark";
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
		participleBenchmark: participleBenchmarkCases,
		robustness: robustnessCases,
		adaptiveDevelopment: adaptiveDevelopmentCases,
	},
	fingerprintInput: targetStimulusFingerprint,
});

for (const [caseId, goldenCase] of Object.entries(corpus.cases)) {
	assertCanonicalTargetClassificationCase({ caseId, ...goldenCase });
}

export const participleBenchmarkSelection =
	corpus.collections.participleBenchmark;
export { participleBenchmarkPairs };
