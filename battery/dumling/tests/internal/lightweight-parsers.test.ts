import { describe, expect, test } from "bun:test";
import {
	ParsingError,
	parseAsAttestation,
	parseAsLemma,
	parseAsReading,
	parseAsSurface,
} from "../../src";
import { decodeDumlingValidationArtifactForRouteKey } from "../../src/operations/parsing/lightweight-parsers";
import {
	buildReadingSchemaFor,
	schemasFor,
} from "../../src/schemas/public-schemas";
import {
	germanHausCitationSurface,
	germanHausLemma,
} from "../helpers/attested-entities";

const germanHausAttestation = {
	members: [{ attested: "Haus", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: germanHausCitationSurface,
} as const;

describe("Dumling lightweight parsers", () => {
	test("exposes the canonical route decoder to verification", () => {
		expect(
			decodeDumlingValidationArtifactForRouteKey("Lemma:de/Lexeme/NOUN"),
		).toBeDefined();
	});

	test("match canonical schemas for all four exact route interfaces", () => {
		const cases = [
			{
				canonical: schemasFor.de.entity.Lemma.Lexeme.NOUN(),
				input: { ...germanHausLemma, canonicalForm: "Ha\u0308user" },
				parse: (input: unknown) =>
					parseAsLemma(input, "de", "Lexeme", "NOUN"),
			},
			{
				canonical: schemasFor.de.entity.Surface.Citation.Lexeme.NOUN(),
				input: germanHausCitationSurface,
				parse: (input: unknown) =>
					parseAsSurface(input, "de", "Citation", "Lexeme", "NOUN"),
			},
			{
				canonical:
					schemasFor.de.entity.Attestation.Citation.Lexeme.NOUN(),
				input: germanHausAttestation,
				parse: (input: unknown) =>
					parseAsAttestation(
						input,
						"de",
						"Citation",
						"Lexeme",
						"NOUN",
					),
			},
			{
				canonical: buildReadingSchemaFor(
					schemasFor.de.entity.Lemma.Lexeme.NOUN(),
				),
				input: {
					lemma: { ...germanHausLemma, canonicalForm: "  Haus  " },
					emojiDescription: "  \u{1F3E0}  ",
				},
				parse: (input: unknown) =>
					parseAsReading(input, "de", "Lexeme", "NOUN"),
			},
		] as const;

		for (const { canonical, input, parse } of cases) {
			expect(parse(input)).toEqual(canonical.parse(input));
			const invalid = { ...input, unexpected: true };
			const expected = canonical.safeParse(invalid);
			if (expected.success)
				throw new Error("invalid fixture was accepted");
			const actual = parse(invalid);
			if (!(actual instanceof ParsingError))
				throw new Error("expected ParsingError");
			expect(actual.issues).toEqual(expected.error.issues);
		}
	});

	test("treats route coordinates as authoritative", () => {
		const input = { ...germanHausLemma, kind: "PROPN" };
		const canonical =
			schemasFor.de.entity.Lemma.Lexeme.NOUN().safeParse(input);
		if (canonical.success) throw new Error("route mismatch was accepted");
		const parsed = parseAsLemma(input, "de", "Lexeme", "NOUN");
		if (!(parsed instanceof ParsingError))
			throw new Error("expected ParsingError");
		expect(parsed.issues).toEqual(canonical.error.issues);
		expect(parsed.issues[0]?.path).toEqual(["kind"]);
	});
});
