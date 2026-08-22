import { parseRuntimePromptRoot } from "../catalog/runtime-prompt-validation.js";

export type RuntimePromptSchemaRoot =
	| "knowledge.de.combined#input"
	| "knowledge.de.combined#output";

/** Lean lower-layer parser seam for operational prompt projections. */
export function parseRuntimePromptSchema<Output = unknown>(
	root: RuntimePromptSchemaRoot,
	input: unknown,
): Output {
	return parseRuntimePromptRoot<Output>(root, input);
}
