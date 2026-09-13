import { describe, expect, test } from "bun:test";

import { applyKnowledgeChange } from "../../src";
import { knowledgeChangeSchema } from "../../src/schema";
import type {
	KnowledgeChange,
	LexicalBreakdown,
	MorphologicalTree,
	ReadingKnowledge,
} from "../../src/types";
import {
	morphologicalTree,
	nounReading,
	nounShadow,
	secondNounReading,
	verbShadow,
} from "./fixtures";

type OwnerKnowledge = ReadingKnowledge;

type ChangeCase = {
	aspect: KnowledgeChange["aspect"];
	kind: KnowledgeChange["kind"];
	existing: OwnerKnowledge;
	change: KnowledgeChange;
	expected: OwnerKnowledge;
};

const alternativeTree: MorphologicalTree = {
	root: {
		nodeKind: "structure",
		children: [{ nodeKind: "unitShadow", unitShadow: verbShadow }],
	},
};
const breakdown: LexicalBreakdown = [nounShadow, verbShadow];
const replacementBreakdown: LexicalBreakdown = [verbShadow, nounShadow];

const cases = [
	{
		aspect: "transcription",
		kind: "Contribute",
		existing: { transcription: "old" },
		change: {
			kind: "Contribute",
			aspect: "transcription",
			value: "old",
		},
		expected: { transcription: "old" },
	},
	{
		aspect: "transcription",
		kind: "Correct",
		existing: { transcription: "old" },
		change: {
			kind: "Correct",
			aspect: "transcription",
			value: "new",
		},
		expected: { transcription: "new" },
	},
	{
		aspect: "transcription",
		kind: "Retract",
		existing: { transcription: "old" },
		change: {
			kind: "Retract",
			aspect: "transcription",
		},
		expected: {},
	},
	{
		aspect: "translations",
		kind: "Contribute",
		existing: { translations: { en: ["old"] } },
		change: {
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["new"],
		},
		expected: { translations: { en: ["old", "new"] } },
	},
	{
		aspect: "translations",
		kind: "Correct",
		existing: { translations: { en: ["old"] } },
		change: {
			kind: "Correct",
			aspect: "translations",
			language: "en",
			value: ["new"],
		},
		expected: { translations: { en: ["new"] } },
	},
	{
		aspect: "translations",
		kind: "Retract",
		existing: { translations: { en: ["old"] } },
		change: {
			kind: "Retract",
			aspect: "translations",
			language: "en",
		},
		expected: {},
	},
	{
		aspect: "semanticRelations",
		kind: "Contribute",
		existing: { semanticRelations: { synonym: [nounReading.lemma] } },
		change: {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [secondNounReading.lemma],
		},
		expected: {
			semanticRelations: {
				synonym: [nounReading.lemma, secondNounReading.lemma],
			},
		},
	},
	{
		aspect: "semanticRelations",
		kind: "Correct",
		existing: { semanticRelations: { synonym: [nounReading.lemma] } },
		change: {
			kind: "Correct",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [secondNounReading.lemma],
		},
		expected: {
			semanticRelations: { synonym: [secondNounReading.lemma] },
		},
	},
	{
		aspect: "semanticRelations",
		kind: "Retract",
		existing: { semanticRelations: { synonym: [nounReading.lemma] } },
		change: {
			kind: "Retract",
			aspect: "semanticRelations",
			relation: "synonym",
		},
		expected: {},
	},
	{
		aspect: "definition",
		kind: "Contribute",
		existing: { definition: "old" },
		change: { kind: "Contribute", aspect: "definition", value: "old" },
		expected: { definition: "old" },
	},
	{
		aspect: "definition",
		kind: "Correct",
		existing: { definition: "old" },
		change: { kind: "Correct", aspect: "definition", value: "new" },
		expected: { definition: "new" },
	},
	{
		aspect: "definition",
		kind: "Retract",
		existing: { definition: "old" },
		change: { kind: "Retract", aspect: "definition" },
		expected: {},
	},
	{
		aspect: "morphologicalTree",
		kind: "Contribute",
		existing: { morphologicalTree },
		change: {
			kind: "Contribute",
			aspect: "morphologicalTree",
			value: morphologicalTree,
		},
		expected: { morphologicalTree },
	},
	{
		aspect: "morphologicalTree",
		kind: "Correct",
		existing: { morphologicalTree },
		change: {
			kind: "Correct",
			aspect: "morphologicalTree",
			value: alternativeTree,
		},
		expected: { morphologicalTree: alternativeTree },
	},
	{
		aspect: "morphologicalTree",
		kind: "Retract",
		existing: { morphologicalTree },
		change: { kind: "Retract", aspect: "morphologicalTree" },
		expected: {},
	},
	{
		aspect: "lexicalBreakdown",
		kind: "Contribute",
		existing: { lexicalBreakdown: breakdown },
		change: {
			kind: "Contribute",
			aspect: "lexicalBreakdown",
			value: breakdown,
		},
		expected: { lexicalBreakdown: breakdown },
	},
	{
		aspect: "lexicalBreakdown",
		kind: "Correct",
		existing: { lexicalBreakdown: breakdown },
		change: {
			kind: "Correct",
			aspect: "lexicalBreakdown",
			value: replacementBreakdown,
		},
		expected: { lexicalBreakdown: replacementBreakdown },
	},
	{
		aspect: "lexicalBreakdown",
		kind: "Retract",
		existing: { lexicalBreakdown: breakdown },
		change: { kind: "Retract", aspect: "lexicalBreakdown" },
		expected: {},
	},
] satisfies ChangeCase[];

function applyCase(existing: OwnerKnowledge, change: KnowledgeChange) {
	return Reflect.apply(applyKnowledgeChange, undefined, [
		existing,
		change,
	]) as OwnerKnowledge;
}

describe("Knowledge Change kind/aspect matrix", () => {
	for (const changeCase of cases) {
		test(`${changeCase.aspect} ${changeCase.kind}`, () => {
			expect(
				knowledgeChangeSchema.safeParse(changeCase.change).success,
			).toBe(true);
			expect(applyCase(changeCase.existing, changeCase.change)).toEqual(
				changeCase.expected,
			);
		});
	}
});
