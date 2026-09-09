import { parseRuntimePromptRoot } from "../catalog/runtime-prompt-validation.js";
import type { GermanKnowledgeFamily } from "../knowledge-generation/de/families";

type KnowledgeRuntimeSchemaRoot =
	| `knowledge.de.${GermanKnowledgeFamily}#input`
	| `knowledge.de.${GermanKnowledgeFamily}#output`;

export type RuntimePromptSchemaRoot = KnowledgeRuntimeSchemaRoot;

/** Lean lower-layer parser seam for operational prompt projections. */
export function parseRuntimePromptSchema<Output = unknown>(
	root: RuntimePromptSchemaRoot,
	input: unknown,
): Output {
	return parseRuntimePromptRoot<Output>(root, input);
}
