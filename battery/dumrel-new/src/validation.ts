import {
	type Constraint,
	type ParsingError,
	parseValidationArtifact,
	type ValidationOperations,
} from "common-utils";
import { validationOperations as dumlingValidationOperations } from "dumling/validation";
import { encodedValidation } from "./generated/validation.js";
import { normalizeText } from "./semantics.js";
import type { KnowledgeChange, ReadingKnowledge } from "./types.js";

type Registry = {
	version: 1;
	roots: Record<"knowledgeChange" | "readingKnowledge", Constraint>;
	definitions: Record<string, Constraint>;
};
const registry: Registry = JSON.parse(encodedValidation);
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
