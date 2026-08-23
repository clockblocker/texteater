import { describe, expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	fixedMembersFor,
} from "dumling/fixed";
import {
	DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
	DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
	fixedKnowledgeFor,
} from "../../src/fixed";
import {
	ParsingError,
	parseAsReadingKnowledge,
} from "../../src/parsing/lightweight-parsers";

describe("fixed German Knowledge", () => {
	test("authors ordinary Knowledge for every fixed DET Reading", () => {
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) => scope === FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
		);
		expect(catalog).toBeDefined();
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			for (const reading of readings?.members ?? []) {
				const found = fixedKnowledgeFor(reading);
				expect(found.decision).toBe("Found");
				if (found.decision !== "Found") continue;
				expect(found.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1);
				expect(found.knowledge.transcription).toBeUndefined();
				expect(found.knowledge.definition).toBeTruthy();
				expect(found.knowledge.translations?.en.length).toBeGreaterThan(
					0,
				);
				const canonicalForm = reading.lemma.canonicalForm;
				if (["der", "die", "das"].includes(canonicalForm)) {
					expect(found.knowledge.semanticRelations?.targetKind).toBe(
						"reading",
					);
					expect(
						found.knowledge.semanticRelations?.synonym?.map(
							(target) => {
								if (!("lemma" in target)) {
									throw new Error(
										"Expected a Reading-targeted synonym.",
									);
								}
								return target.lemma.canonicalForm;
							},
						),
					).toEqual(
						["der", "die", "das"].filter(
							(target) => target !== canonicalForm,
						),
					);
					expect(found.coverage.semanticRelations.synonym).toBe(
						"Authored",
					);
					expect(found.coverage.semanticRelationTargetKind).toBe(
						"reading",
					);
				} else {
					expect(found.knowledge.semanticRelations).toBeUndefined();
					expect(found.coverage.semanticRelations.synonym).toBe(
						"ReviewedEmpty",
					);
				}
				expect(Object.isFrozen(found.knowledge)).toBe(true);
				const parsed = parseAsReadingKnowledge(found.knowledge);
				expect(parsed).not.toBeInstanceOf(ParsingError);
				expect(parsed).toEqual(found.knowledge);
			}
		}
	});

	test("records reviewed-empty relation coverage separately from Knowledge", () => {
		expect(DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE).toEqual({
			transcription: "Unauthored",
			definition: "Authored",
			translations: { en: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		});
		expect(Object.isFrozen(DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE)).toBe(
			true,
		);
	});

	test("authors fixed definitions and translations for all forty-three PRON Readings", () => {
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) =>
				scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
		);
		expect(catalog?.members).toHaveLength(43);
		for (const lemma of catalog?.members ?? []) {
			const reading = fixedMembersFor.reading(lemma)?.members[0];
			if (!reading) throw new Error("Expected one fixed PRON Reading.");
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.scope).toBe(
				FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
			);
			expect(found.knowledge.definition).toBeTruthy();
			expect(found.knowledge.translations?.en.length).toBeGreaterThan(0);
			expect(found.knowledge.semanticRelations).toBeUndefined();
			expect(parseAsReadingKnowledge(found.knowledge)).toEqual(
				found.knowledge,
			);
		}
	});

	test("authors one Reading and all peer synonyms for promoted sein forms", () => {
		const peerForms = ["sein", "bin", "bist", "ist", "sind", "seid"];
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) => scope === FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
		);
		expect(catalog).toBeDefined();
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			const reading = readings?.members[0];
			if (!reading) throw new Error("Expected one fixed AUX Reading.");
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1);
			expect(found.knowledge.definition).toBeTruthy();
			expect(found.knowledge.translations?.en.length).toBeGreaterThan(0);
			if (peerForms.includes(lemma.canonicalForm)) {
				expect(found.knowledge.semanticRelations?.targetKind).toBe(
					"reading",
				);
				expect(
					found.knowledge.semanticRelations?.synonym?.map(
						(target) => {
							if (!("lemma" in target)) {
								throw new Error(
									"Expected a Reading-targeted synonym.",
								);
							}
							return target.lemma.canonicalForm;
						},
					),
				).toEqual(
					peerForms.filter(
						(target) => target !== lemma.canonicalForm,
					),
				);
				expect(found.coverage.semanticRelations.synonym).toBe(
					"Authored",
				);
				expect(found.coverage.semanticRelationTargetKind).toBe(
					"reading",
				);
			} else {
				expect(found.knowledge.semanticRelations).toBeUndefined();
				expect(found.coverage).toBe(
					DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
				);
			}
			const parsed = parseAsReadingKnowledge(found.knowledge);
			expect(parsed).not.toBeInstanceOf(ParsingError);
			expect(parsed).toEqual(found.knowledge);
		}
	});

	test("returns an explicit Miss for an unauthored Reading", () => {
		const lemma = allFixedLemmaCatalogs()[0]?.members[0];
		if (!lemma) throw new Error("Fixed DET fixture is missing.");
		expect(fixedKnowledgeFor({ lemma, emojiDescription: "🆕" })).toEqual({
			decision: "Miss",
			reason: "MemberNotCatalogued",
		});
	});
});
