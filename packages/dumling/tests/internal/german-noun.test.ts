import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	germanBVGAbbreviationSelection,
	germanHausCitationSurface,
	germanKindLemma,
	makeLexemeSurfaceReference,
} from "../helpers";

describe("German noun schemas", () => {
	it("accept supported noun lemmas and inflections", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.NOUN().safeParse(germanKindLemma)
				.success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.NOUN().safeParse({
				language: "de",
				spelledSelection: "kindern",

				surface: {
					...makeLexemeSurfaceReference("de", "NOUN", "kind"),
					language: "de",
					normalizedFullSurface: "kindern",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Dat",
						number: "Plur",
					},
				},
			}).success,
		).toBe(true);
	});

	it("reject unsupported noun features", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.NOUN().safeParse({
				language: "de",
				canonicalLemma: "kind",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: {
					case: "Nom",
				},
				meaningInEmojis: "👶",
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.NOUN().safeParse({
				language: "de",
				spelledSelection: "kindern",

				surface: {
					...makeLexemeSurfaceReference("de", "NOUN", "kind"),
					language: "de",
					normalizedFullSurface: "kindern",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Ins",
						number: "Dual",
					},
				},
			}).success,
		).toBe(false);
	});

	it("keeps registry access and citation selections intact", () => {
		expect(
			schemasFor.de.entity.Surface.Citation.Lexeme.NOUN().safeParse(
				germanHausCitationSurface,
			).success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Selection.Citation.Lexeme.PROPN().safeParse(
				germanBVGAbbreviationSelection,
			).success,
		).toBe(true);
		expect(
			typeof schemasFor.de.entity.Selection.Citation.Lexeme.NOUN().parse,
		).toBe("function");
	});
});
