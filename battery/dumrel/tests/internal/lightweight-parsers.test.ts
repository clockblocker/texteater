import { describe, expect, test } from "bun:test";
import {
	ParsingError,
	parseAsKnowledgeChange,
	parseAsKnowledgeSettings,
	parseAsMorphemeReadingReference,
	parseAsUnitShadow,
} from "../../src";
import {
	knowledgeChangeSchema,
	knowledgeSettingsSchema,
	morphemeReadingReferenceSchema,
	unitShadowSchema,
} from "../../src/schema";
import { morphemeReading } from "./fixtures";

describe("Dumrel lightweight parsers", () => {
	test("match canonical normalization and issues at the package-root seam", () => {
		const cases = [
			{
				canonical: knowledgeSettingsSchema,
				input: {
					transcription: true,
					definition: true,
					translations: { en: true },
					morphologicalTree: false,
					lexicalBreakdown: false,
					semanticRelations: {
						synonym: true,
						nearSynonym: true,
						antonym: true,
						nearAntonym: true,
						hypernym: true,
						hyponym: true,
						meronym: true,
						holonym: true,
					},
				},
				parse: parseAsKnowledgeSettings,
			},
			{
				canonical: unitShadowSchema,
				input: {
					language: "de",
					canonicalForm: "  Ha\u0308user  ",
					family: "Lexeme",
					kind: "NOUN",
				},
				parse: parseAsUnitShadow,
			},
			{
				canonical: knowledgeChangeSchema,
				input: {
					kind: "Contribute",
					aspect: "definition",
					value: "  Geba\u0308ude  ",
				},
				parse: parseAsKnowledgeChange,
			},
		] as const;

		for (const { canonical, input, parse } of cases) {
			expect(parse(input)).toEqual(canonical.parse(input));
			const invalid = { ...input, unexpected: true };
			const expected = canonical.safeParse(invalid);
			if (expected.success)
				throw new Error("invalid fixture was accepted");
			const actual = parse(invalid);
			if (!(actual instanceof ParsingError)) {
				throw new Error("expected ParsingError");
			}
			expect(actual.issues).toEqual(expected.error.issues);
		}
	});

	test("keeps canonical emoji normalization and diagnostics on first and repeated parses", () => {
		for (const input of [
			{ ...morphemeReading, emojiDescription: "  🧩  " },
			{ ...morphemeReading, emojiDescription: "not emoji" },
		]) {
			const expected = morphemeReadingReferenceSchema.safeParse(input);
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const actual = parseAsMorphemeReadingReference(input);
				if (expected.success) {
					expect(actual).toEqual(expected.data);
				} else {
					expect(actual).toBeInstanceOf(ParsingError);
					if (!(actual instanceof ParsingError)) {
						throw new Error("expected ParsingError");
					}
					expect(actual.issues).toEqual(expected.error.issues);
				}
			}
		}
	});
});
