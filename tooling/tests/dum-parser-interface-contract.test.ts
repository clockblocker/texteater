import { expect, test } from "bun:test";
import * as dumdict from "dumdict";
import * as dumling from "dumling";
import * as dumrel from "dumrel";
import type { DumdictParserInterface } from "../dumdict-parser-interface";

const dictionary: DumdictParserInterface = dumdict;
void dictionary;
test("replacement public operations use the settled unit and Knowledge contracts", () => {
	expect(Object.keys(dumling).sort()).toEqual([
		"GrundformAssessmentError",
		"ParsingError",
		"canonicalFormKey",
		"checkIfGrundform",
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
	expect(Object.keys(dumrel).sort()).toEqual([
		"KnowledgePolicyUnavailable",
		"ParsingError",
		"allowedComplementKinds",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"formulaRoleValues",
		"germanConjugationClass",
		"germanPluralPattern",
		"governedCaseValues",
		"locutionTypeValues",
		"parseReadingKnowledge",
		"participleMeaningValues",
		"projectParticipleSources",
		"projectPrepositionalGovernment",
		"projectSemanticRelations",
		"sayingTypeValues",
		"selectKnowledge",
		"translationLanguageValues",
	]);
});
