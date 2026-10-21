import { expect, test } from "bun:test";
import { readingKnowledgeValidator } from "../convex/modules/notes/readingKnowledgeValidator";

test("Reading Note exposes typed Hebrew paradigm forms", () => {
	expect(readingKnowledgeValidator.fields.hebrewParadigm.isOptional).toBe(
		"optional",
	);
	expect(
		JSON.stringify(readingKnowledgeValidator.fields.hebrewParadigm.json),
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
	expect(canonicalOccurrenceValidator.fields.surfaceLanguage.json).toEqual(
		languageValidator.json,
	);
});

test("layout routes and both stored layout scopes use registered target languages", () => {
	expect(readingBlockRouteValidator.fields.targetLanguage.json).toEqual(
		grammaticalLanguageValidator.json,
	);
	for (const table of [
		visitorTables.readingLanguageLayouts,
		visitorTables.readingFamilyKindLayouts,
	]) {
		expect(table.validator.fields.targetLanguage.json).toEqual(
			grammaticalLanguageValidator.json,
		);
	}
});
