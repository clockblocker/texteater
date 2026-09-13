import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { berlinLemma, type houseReading, prefixLemma } from "../fixtures.js";

const knowledge: Dumrel.ReadingKnowledge<typeof houseReading> = {
	semanticRelations: { nearSynonym: [berlinLemma] },
};
void knowledge;

const change: Dumrel.KnowledgeChange<typeof houseReading> = {
	kind: "Contribute",
	aspect: "semanticRelations",
	relation: "synonym",
	value: [berlinLemma],
};
void change;

const invalid: Dumrel.KnowledgeChange<typeof houseReading> = {
	kind: "Contribute",
	aspect: "semanticRelations",
	relation: "synonym",
	// @ts-expect-error A Morpheme target is outside the source Reading's Family.
	value: [prefixLemma],
};
void invalid;

declare const source: Dumling.Reading;
declare const genericKnowledge: Dumrel.ReadingKnowledge<typeof source>;
void genericKnowledge;

const nounShadow: Dumrel.UnitShadow = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Haus",
};
void nounShadow;
