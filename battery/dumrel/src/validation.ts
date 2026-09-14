import { validationOperations as dumlingValidationOperations } from "dumling/validation";
import {
	type CompiledValidationRegistry,
	type ParsingError,
	parseCompiledValidation,
	type ValidationOperations,
} from "dumval/runtime";
import { validationRegistry } from "./generated/linked-validation.js";
import { normalizeText } from "./semantics.js";
import type { KnowledgeChange, ReadingKnowledge } from "./types.js";

type Root =
	| "semanticProjectionInput"
	| "knowledgeChange"
	| "readingKnowledge"
	| "knowledgeSettings"
	| "knowledgeRequestMask"
	| "knowledgeSelectionInput";
const registry: CompiledValidationRegistry = validationRegistry;
const operations: ValidationOperations = {
	...dumlingValidationOperations,
	"dumrel.normalize-text": (value) => ({
		value: normalizeText(value as string),
	}),
};
function parse<T>(root: Root, input: unknown) {
	return parseCompiledValidation<T>(registry, root, input, operations);
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
