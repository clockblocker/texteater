/**
 * The experiments `cli/evaluate.ts` lists and runs: German `segment.inUnits`
 * in gold and raw mode over the lab's frozen sets, and `splitText` over
 * dumspec's ud-drafts (#701, #845).
 */
import { fileURLToPath } from "node:url";

export {
	evaluateExperiment,
	evaluationMetrics,
	listExperiments,
} from "./evaluation/experiments.js";

/** Repository default; consumers can always supply a different output directory. */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../.runs/dumgen/", import.meta.resolve("dumgen/package.json")),
);
