import {
	type Constraint,
	type ParsingError,
	parseValidationArtifact,
	type ValidationOperations,
} from "common-utils";
import { validationOperations as dumlingValidationOperations } from "dumling/validation";
import { validationRegistry } from "./generated/validation-runtime.js";
import { normalizeText } from "./semantics.js";
import type { KnowledgeChange, ReadingKnowledge } from "./types.js";

type Registry = {
	version: 1;
	roots: Record<
		| "semanticProjectionInput"
		| "knowledgeChange"
		| "readingKnowledge"
		| "knowledgeSettings"
		| "knowledgeRequestMask"
		| "knowledgeSelectionInput",
		Constraint
	>;
	definitions: Record<string, Constraint>;
};
const registry: Registry = /* @__PURE__ */ validationRegistry;
const operations: ValidationOperations = {
	...dumlingValidationOperations,
	"dumrel.normalize-text": (value) => ({
		value: normalizeText(value as string),
	}),
};
function parse<T>(root: keyof Registry["roots"], input: unknown) {
	return parseValidationArtifact<T>(
		{
			version: 1,
			root: registry.roots[root],
			definitions: registry.definitions,
		},
		input,
		operations,
	);
}
export const parseKnowledgeShape = (
	input: unknown,
): ReadingKnowledge | ParsingError =>
	parse<ReadingKnowledge>("readingKnowledge", input);
export const parseChangeShape = (
	input: unknown,
): KnowledgeChange | ParsingError =>
	parse<KnowledgeChange>("knowledgeChange", input);

export const parseSettingsShape = (input: unknown) =>
	parse<import("./types.js").KnowledgeSettings>("knowledgeSettings", input);
export const parseRequestMaskShape = (input: unknown) =>
	parse<import("./types.js").KnowledgeRequestMask>(
		"knowledgeRequestMask",
		input,
	);

export const parseSelectionShape = (input: unknown) =>
	parse<import("./types.js").KnowledgeSelectionInput>(
		"knowledgeSelectionInput",
		input,
	);

export const parseProjectionShape = (input: unknown) =>
	parse<import("./types.js").ReadingWithKnowledge[]>(
		"semanticProjectionInput",
		input,
	);
