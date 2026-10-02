/**
 * The experiments `cli/evaluate.ts` and the Laboratory list and run. The
 * legacy pipeline's experiments load behind this module: while their modules
 * fail to load, they are left out of the list and refused by id, and nothing
 * else breaks (#701). The German `segment.inUnits` experiments moved to
 * dumgen.
 */
import { fileURLToPath } from "node:url";
import type * as Legacy from "./legacy-experiments.js";

export { disagreementsFileName } from "./evaluation/spec-review.js";

const legacy: { readonly module: typeof Legacy } | { readonly error: string } =
	await import("./legacy-experiments.js").then(
		(module) => ({ module }),
		(error: unknown) => ({
			error: error instanceof Error ? error.message : String(error),
		}),
	);

function legacyExperiments(): typeof Legacy {
	if ("error" in legacy)
		throw Error(`The legacy experiments do not load: ${legacy.error}`);
	return legacy.module;
}

function listLegacy(): {
	readonly entries: ReturnType<typeof Legacy.listExperiments>;
	readonly error?: string;
} {
	try {
		return { entries: legacyExperiments().listExperiments() };
	} catch (error) {
		return {
			entries: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function listExperiments() {
	return listLegacy().entries;
}

/** Why the legacy experiments are missing from `listExperiments`, if they are. */
export const unavailableExperiments = () => listLegacy().error;

export const getExperiment: typeof Legacy.getExperiment = (id) =>
	legacyExperiments().getExperiment(id);

export const operationExperiment: typeof Legacy.operationExperiment = (
	id,
	options,
) => legacyExperiments().operationExperiment(id, options);

export const resolveOrGenerateTranslation: typeof Legacy.resolveOrGenerateTranslation =
	(options, raw) =>
		legacyExperiments().resolveOrGenerateTranslation(options, raw);

export const reviewEvaluationRun: typeof Legacy.reviewEvaluationRun = (run) =>
	legacyExperiments().reviewEvaluationRun(run);

export const evaluateExperiment: typeof Legacy.evaluateExperiment = (args) =>
	legacyExperiments().evaluateExperiment(args);

/** Repository default; consumers can always supply a different output directory. */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL(
		"../../.runs/dumgen/",
		import.meta.resolve("legacy-dumgen/package.json"),
	),
);
