import { expect, test } from "bun:test";
import * as dumdict from "dumdict";
import * as dumling from "dumling";
import * as dumrel from "dumrel";
import * as dumgen from "legacy-dumgen";
import type { DumdictParserInterface } from "../dumdict-parser-interface";

const dictionary: DumdictParserInterface = dumdict;
void dictionary;
test("replacement public operations use the settled unit and Knowledge contracts", () => {
	expect(Object.keys(dumling).sort()).toEqual([
		"GrundformAssessmentError",
		"ParsingError",
		"checkIfGrundform",
		"foldCase",
		"isSyncreticUnit",
		"isSyncretism",
		"lemmaIdentityKey",
		"parseUnit",
		"readingIdentityKey",
		"sameLemma",
		"syncretismView",
		"syncretize",
	]);
	expect(Object.keys(dumrel).sort()).toEqual([
		"KnowledgePolicyUnavailable",
		"ParsingError",
		"allowedComplementKinds",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"germanConjugationClass",
		"germanPluralPattern",
		"governedCaseValues",
		"normalizeText",
		"parseReadingKnowledge",
		"participleMeaningValues",
		"projectParticipleSources",
		"projectPrepositionalGovernment",
		"projectSemanticRelations",
		"selectKnowledge",
		"translationLanguageValues",
	]);
	expect(Object.keys(dumgen).sort()).toEqual([
		"DumgenFailure",
		"createDumgen",
		"deriveGrammaticalComponent",
		"deriveNounArticle",
		"draftKnowledge",
		"effectiveRoute",
		"familyOf",
		"fixednessFloor",
		"fusionAt",
		"governorTargets",
		"headOf",
		"largestOf",
		"membersOf",
		"nounArticleReference",
		"offsetsOf",
		"phrasemeOf",
		"resolvedUnitAt",
		"resolvedWordAt",
		"segmentAt",
		"selectAuthoredArticle",
		"selectAuthoredReading",
		"selectFormAlternatives",
		"selectGrammaticalAlternatives",
		"selectIdentity",
		"selectNounHeadingArticle",
		"selectPhrasemeKind",
		"selectRoute",
		"slotsAt",
		"targetOf",
		"validateEncounter",
	]);
});
