import {
	type ParsingError,
	parseCompiledValidation,
	type ValidationOperations,
} from "common-utils/validation";
import { validationOperations as dumlingValidationOperations } from "dumling/validation";
import { validationRegistry } from "./generated/linked-validation.js";
import type {
	KnowledgeChange,
	LemmaParadigm,
	ParadigmChange,
	ReadingKnowledge,
} from "./types.js";

type Root =
	| "semanticProjectionInput"
	| "knowledgeChange"
	| "readingKnowledge"
	| "knowledgeSelectionInput"
	| "lemmaParadigm"
	| "paradigmChange";
const operations: ValidationOperations = dumlingValidationOperations;
function parse<T>(root: Root, input: unknown) {
	return parseCompiledValidation<Root, T>(
		validationRegistry,
		root,
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

export const parseLemmaParadigmShape = (
	input: unknown,
): LemmaParadigm | ParsingError => parse<LemmaParadigm>("lemmaParadigm", input);

export const parseParadigmChangeShape = (
	input: unknown,
): ParadigmChange | ParsingError =>
	parse<ParadigmChange>("paradigmChange", input);
