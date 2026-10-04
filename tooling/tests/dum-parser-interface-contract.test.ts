import { expect, test } from "bun:test";
import type { DumdictParserInterface } from "../dumdict-parser-interface";

// A pin isn't a caller (#419): `bun run knip` counts a root's export as used
// only when another workspace uses it. So these pins read each root through
// `typeof import()` and a computed specifier, which knip doesn't count as a
// use of any name.
const conformsToParserInterface = (
	root: typeof import("dumdict"),
): DumdictParserInterface => root;
void conformsToParserInterface;

async function rootKeys(specifier: string): Promise<string[]> {
	return Object.keys(await import(specifier)).sort();
}

test("replacement public operations use the settled unit and Knowledge contracts", async () => {
	expect(await rootKeys("dumling")).toEqual([
		"ParsingError",
		"canonicalFormKey",
		"foldCase",
		"isSyncreticUnit",
		"isSyncretism",
		"lemmaIdentityKey",
		"normalizeForm",
		"parseUnit",
		"readingIdentityKey",
		"sameLemma",
		"sameReading",
		"syncretismView",
		"syncretize",
	]);
	expect(await rootKeys("dumrel")).toEqual([
		"KnowledgePolicyUnavailable",
		"ParsingError",
		"allowedComplementKinds",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"formulaRoleValues",
		"germanConjugationClass",
		"governedCaseValues",
		"locutionTypeValues",
		"parseReadingKnowledge",
		"participleMeaningValues",
		"projectParticipleSources",
		"projectSemanticRelations",
		"sayingTypeValues",
		"selectKnowledge",
		"translationLanguageValues",
	]);
});
