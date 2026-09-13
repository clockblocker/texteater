import type { z } from "zod";
import type { DumlingParserInterface } from "../../../../tooling/dumling-parser-interface";
import {
	ParsingError,
	parseAsAttestation,
	parseAsLemma,
	parseAsReading,
	parseAsSurface,
} from "../../src";
import type {
	CanonicalDumlingValidationOutputForRoute,
	CanonicalDumlingValidationSchemaForRoute,
	ProveCanonicalDumlingValidationOutputRoute,
	ProveCanonicalDumlingValidationSchemaRoute,
} from "../../src/operations/parsing/validation-route-proofs";
import type { schemasFor } from "../../src/schemas/public-schemas";
import type { Attestation, Lemma, Reading, Surface } from "../../src/types";

const packageRootParsers = {
	ParsingError,
	parseAsAttestation,
	parseAsLemma,
	parseAsReading,
	parseAsSurface,
} satisfies DumlingParserInterface;

void packageRootParsers;

type GermanNounLemmaSchema = ReturnType<
	typeof schemasFor.de.entity.Lemma.Lexeme.NOUN
>;
type _ActualGermanNounSchemaIsTheGeneratedRouteSource =
	ProveCanonicalDumlingValidationSchemaRoute<
		"Lemma:de/Lexeme/NOUN",
		GermanNounLemmaSchema
	>;

type GermanNounSurfaceSchema = ReturnType<
	typeof schemasFor.de.entity.Surface.Citation.Lexeme.NOUN
>;
type _SwappedCanonicalLeafMustFail = ProveCanonicalDumlingValidationSchemaRoute<
	"Lemma:de/Lexeme/NOUN",
	// @ts-expect-error A Surface schema cannot be swapped into a Lemma route.
	GermanNounSurfaceSchema
>;

type _ActualGermanNounOutputIsBoundToItsRoute =
	ProveCanonicalDumlingValidationOutputRoute<
		"Lemma:de/Lexeme/NOUN",
		z.output<GermanNounLemmaSchema>
	>;
type _SwappedGeneratedRouteOutputMustFail =
	ProveCanonicalDumlingValidationOutputRoute<
		"Lemma:de/Lexeme/NOUN",
		// @ts-expect-error A generated Lemma route cannot promise a Surface payload.
		z.output<GermanNounSurfaceSchema>
	>;

declare const actualGermanNounSchema: CanonicalDumlingValidationSchemaForRoute<"Lemma:de/Lexeme/NOUN">;
void actualGermanNounSchema;
declare const actualGermanNounOutput: CanonicalDumlingValidationOutputForRoute<"Lemma:de/Lexeme/NOUN">;
void actualGermanNounOutput;

const unknownInput: unknown = {};

parseAsLemma(unknownInput, "de", "Lexeme", "NOUN") satisfies
	| Lemma<"de", "Lexeme", "NOUN">
	| ParsingError<Lemma<"de", "Lexeme", "NOUN">>;

parseAsSurface(unknownInput, "de", "Inflection", "Lexeme", "VERB") satisfies
	| Surface<"de", "Inflection", "Lexeme", "VERB">
	| ParsingError<Surface<"de", "Inflection", "Lexeme", "VERB">>;

parseAsAttestation(unknownInput, "de", "Citation", "Lexeme", "NOUN") satisfies
	| Attestation<"de", "Citation", "Lexeme", "NOUN">
	| ParsingError<Attestation<"de", "Citation", "Lexeme", "NOUN">>;

parseAsReading(unknownInput, "de", "Lexeme", "VERB") satisfies
	| Reading<"de", "Lexeme", "VERB">
	| ParsingError<Reading<"de", "Lexeme", "VERB">>;

// @ts-expect-error Hebrew has no inflectional Phraseme route.
parseAsSurface(unknownInput, "he", "Inflection", "Phraseme", "Idiom");

// @ts-expect-error NOUN is a Lexeme kind, not a Morpheme kind.
parseAsLemma(unknownInput, "de", "Morpheme", "NOUN");
