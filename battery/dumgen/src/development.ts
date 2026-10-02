/**
 * The experiments `cli/evaluate.ts` lists and runs: German `segment.inUnits`
 * over the lab's frozen sets (#701). The legacy pipeline's experiments stay
 * in legacy-dumgen.
 */
import { fileURLToPath } from "node:url";

export {
	evaluateSegmentInUnitsExperiment as evaluateExperiment,
	listSegmentInUnitsExperiments as listExperiments,
	segmentInUnitsMetrics as evaluationMetrics,
} from "./segment-in-units/de/experiment.js";

/** Repository default; consumers can always supply a different output directory. */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../.runs/dumgen/", import.meta.resolve("dumgen/package.json")),
);
