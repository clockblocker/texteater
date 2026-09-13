import { expect, test } from "bun:test";
import {
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import { validationOperations } from "dumling/validation";
import * as schemas from "dumrel/schema";
import { encodedValidation } from "../src/generated/validation";
import { normalizeText } from "../src/semantics";
import { houseLemma, houseReading, prefixLemma } from "./fixtures";

const registry = JSON.parse(encodedValidation) as {
	roots: Record<string, ValidationArtifact["root"]>;
	definitions: ValidationArtifact["definitions"];
};
const shadow = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Haus",
};
const samples: Record<string, unknown[]> = {
	readingKnowledge: [
		{},
		{ definition: "  Geba\u0308ude  ", translations: { en: [" house "] } },
		{ semanticRelations: { synonym: [houseLemma] } },
		{
			semanticRelations: {
				targetKind: "reading",
				synonym: [houseReading],
			},
		},
		{
			morphologicalTree: {
				root: {
					nodeKind: "structure",
					children: [
						{
							nodeKind: "morphemeReading",
							reading: {
								unitKind: "Reading",
								lemma: prefixLemma,
								emojiDescription: "🚫",
							},
						},
					],
				},
			},
		},
	],
	knowledgeChange: [
		{ kind: "Contribute", aspect: "definition", value: " x " },
		{ kind: "Retract", aspect: "translations", language: "en" },
		{
			kind: "Correct",
			aspect: "semanticRelations",
			relation: "synonym",
			targetKind: "reading",
			value: [houseReading],
		},
	],
	knowledgeSettings: [
		{},
		{ definition: false, semanticRelations: { synonym: true } },
	],
	knowledgeRequestMask: [{}, { translations: { en: null } }],
	knowledgeSelectionInput: [
		{
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
			settings: { definition: false },
		},
	],
	pendingSemanticRelation: [{ relation: "nearSynonym", target: shadow }],
	unitShadow: [shadow],
	lexicalBreakdown: [[shadow, shadow]],
	morphologicalTree: [
		{
			root: {
				nodeKind: "structure",
				children: [{ nodeKind: "unitShadow", unitShadow: shadow }],
			},
		},
	],
	semanticRelations: [
		{ targetKind: "reading", synonym: [houseReading] },
		{ hypernym: [houseLemma] },
	],
	semanticProjectionInput: [
		[{ reading: houseReading, knowledge: { definition: " home " } }],
	],
	semanticRelationProjection: [
		{
			source: houseReading,
			relation: "hyponym",
			target: houseLemma,
			provenance: "inferred",
		},
	],
	directSemanticRelation: ["synonym", "holonym"],
	semanticRelation: ["hyponym", "meronym"],
	translationLanguage: ["en", "ru"],
};

test("every generated root agrees with its public canonical schema, including normalization and recursive leaves", () => {
	expect(Object.keys(samples).sort()).toEqual(
		Object.keys(registry.roots).sort(),
	);
	for (const [root, examples] of Object.entries(samples)) {
		const schema = schemas[`${root}Schema` as keyof typeof schemas];
		for (const input of [
			...examples,
			undefined,
			null,
			[],
			{},
			"",
			42,
			...examples
				.filter((v) => typeof v === "object" && !Array.isArray(v))
				.map((v) => ({ ...(v as object), unexpected: true })),
		]) {
			const canonical = schema.safeParse(input);
			const compiled = parseValidationArtifact(
				{
					version: 1,
					root: registry.roots[root]!,
					definitions: registry.definitions,
				},
				input,
				{
					...validationOperations,
					"dumrel.normalize-text": (value) => ({
						value: normalizeText(value as string),
					}),
				},
			);
			expect(
				!(compiled instanceof ParsingError),
				`${root}: ${JSON.stringify(input)}`,
			).toBe(canonical.success);
			if (canonical.success) expect(compiled).toEqual(canonical.data);
		}
	}
});
