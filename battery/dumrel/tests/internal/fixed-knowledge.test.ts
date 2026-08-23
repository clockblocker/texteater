import { describe, expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	fixedMembersFor,
} from "dumling/fixed";
import {
	DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
	fixedKnowledgeFor,
} from "../../src/fixed";
import {
	ParsingError,
	parseAsReadingKnowledge,
} from "../../src/parsing/lightweight-parsers";

describe("fixed German DET Knowledge", () => {
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
					expect(
						found.knowledge.semanticRelations?.synonym?.map(
							(target) => target.canonicalForm,
						),
					).toEqual(
						["der", "die", "das"].filter(
							(target) => target !== canonicalForm,
						),
					);
					expect(found.coverage.semanticRelations.synonym).toBe(
						"Authored",
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

	test("returns an explicit Miss for an unauthored Reading", () => {
		const lemma = allFixedLemmaCatalogs()[0]?.members[0];
		if (!lemma) throw new Error("Fixed DET fixture is missing.");
		expect(fixedKnowledgeFor({ lemma, emojiDescription: "🆕" })).toEqual({
			decision: "Miss",
			reason: "MemberNotCatalogued",
		});
	});
});
