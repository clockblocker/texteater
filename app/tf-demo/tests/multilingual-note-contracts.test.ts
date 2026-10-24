// Convex marks its runtime JSON getter internal and omits it from declarations.
const validatorToJson = (value: unknown): unknown =>
	(value as { readonly json: unknown }).json;

import { expect, test } from "bun:test";
import { readingKnowledgeValidator } from "../convex/modules/notes/readingKnowledgeValidator";

test("Reading Note exposes typed Hebrew paradigm forms", () => {
	expect(readingKnowledgeValidator.fields.hebrewParadigm.isOptional).toBe(
		"optional",
	);
	expect(
		JSON.stringify(
			validatorToJson(readingKnowledgeValidator.fields.hebrewParadigm),
		),
	).toContain('"forms"');
});

import { visitorTables } from "../convex/model/tables/visitors";
import {
	grammaticalLanguageValidator,
	languageValidator,
	readingBlockRouteValidator,
} from "../convex/model/validators";
import { canonicalOccurrenceValidator } from "../convex/modules/notes/resolutionNote";

test("canonical navigation accepts all stored dictionary languages", () => {
	expect(
		validatorToJson(canonicalOccurrenceValidator.fields.surfaceLanguage),
	).toEqual(validatorToJson(languageValidator));
});

test("layout routes and both stored layout scopes use registered target languages", () => {
	expect(
		validatorToJson(readingBlockRouteValidator.fields.targetLanguage),
	).toEqual(validatorToJson(grammaticalLanguageValidator));
	for (const table of [
		visitorTables.readingLanguageLayouts,
		visitorTables.readingFamilyKindLayouts,
	]) {
		expect(validatorToJson(table.validator.fields.targetLanguage)).toEqual(
			validatorToJson(grammaticalLanguageValidator),
		);
	}
});
