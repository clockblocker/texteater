import { expect, test } from "bun:test";
import * as dumdict from "dumdict";
import * as dumgen from "dumgen";
import * as dumling from "dumling";
import * as dumrel from "dumrel";
import type { DumdictParserInterface } from "../dumdict-parser-interface";

const dictionary: DumdictParserInterface = dumdict;
void dictionary;
test("replacement public operations use the settled unit and Knowledge contracts", () => {
	expect(Object.keys(dumling).sort()).toEqual([
		"GrundformAssessmentError",
		"ParsingError",
		"UnitKind",
		"checkIfGrundform",
		"parseUnit",
	]);
	expect(Object.keys(dumrel).sort()).toEqual([
		"KnowledgePolicyUnavailable",
		"ParsingError",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"parseReadingKnowledge",
		"projectSemanticRelations",
		"selectKnowledge",
		"translationLanguageValues",
	]);
	expect(Object.keys(dumgen).sort()).toEqual([
		"DumgenFailure",
		"createDumgen",
		"selectGrammaticalAlternatives",
		"validateEncounter",
	]);
});
