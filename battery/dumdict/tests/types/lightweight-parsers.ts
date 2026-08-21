import type { ParsingError as ParsingErrorType } from "common-utils";
import type {
	Attestation,
	Lemma,
	SupportedLanguage,
	Surface,
} from "dumling/types";
import { z } from "zod";
import type { DumdictParserInterface } from "../../../../tooling/dumdict-parser-interface";
import { canonicalDumdictValidationSchemas } from "../../codegen/validation-artifacts";
import type {
	ActualDumdictValidationRouteOutputMap,
	CanonicalDumdictValidationSchemaForRoute,
	DumdictValidationRouteInputMap,
	DumdictValidationRouteKey,
	DumdictValidationRouteOutputMap,
	ProveCanonicalDumdictValidationSchemaRoute,
} from "../../codegen/validation-route-proofs";
import * as dumdict from "../../src";
import type { LemmaRecord } from "../../src/domain-types";
import type { GeneratedDumlingCompatibilityValidationRouteDescriptor } from "../../src/generated/validation-artifacts";

const packageRootParsers = {
	ParsingError: dumdict.ParsingError,
	parseAsChangePrecondition: dumdict.parseAsChangePrecondition,
	parseAsCommitChangesRequest: dumdict.parseAsCommitChangesRequest,
	parseAsCommitChangesResult: dumdict.parseAsCommitChangesResult,
	parseAsDumdictPlan: dumdict.parseAsDumdictPlan,
	parseAsLemmaRecord: dumdict.parseAsLemmaRecord,
	parseAsPendingSemanticRelationLocator:
		dumdict.parseAsPendingSemanticRelationLocator,
	parseAsPendingSemanticRelationRecord:
		dumdict.parseAsPendingSemanticRelationRecord,
	parseAsPlannedChangeOp: dumdict.parseAsPlannedChangeOp,
	parseAsReadingEntry: dumdict.parseAsReadingEntry,
	parseAsReadingPatchOp: dumdict.parseAsReadingPatchOp,
	parseAsSurfaceEntry: dumdict.parseAsSurfaceEntry,
} satisfies DumdictParserInterface;

void packageRootParsers;

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Value extends true> = Value;

type CompatibilityOutput<Descriptor> =
	Descriptor extends Readonly<{
		entity: infer Entity;
		language: infer Language extends SupportedLanguage;
	}>
		? Entity extends "Lemma"
			? Lemma<Language>
			: Entity extends "Surface"
				? Surface<Language>
				: Entity extends "Attestation"
					? Attestation<Language>
					: never
		: never;

type EnglishVerbLemmaDescriptor =
	GeneratedDumlingCompatibilityValidationRouteDescriptor<"internal:dumling:Lemma:en/Lexeme/VERB">;

const englishVerbLemmaDescriptor = {
	entity: "Lemma",
	key: "internal:dumling:Lemma:en/Lexeme/VERB",
	language: "en",
} as const satisfies EnglishVerbLemmaDescriptor;
void englishVerbLemmaDescriptor;

const swappedLanguageDescriptor = {
	entity: "Lemma",
	key: "internal:dumling:Lemma:en/Lexeme/VERB",
	// @ts-expect-error The generated English route cannot claim German output.
	language: "de",
} as const satisfies EnglishVerbLemmaDescriptor;
void swappedLanguageDescriptor;

const swappedEntityDescriptor = {
	// @ts-expect-error The generated Lemma route cannot claim Surface output.
	entity: "Surface",
	key: "internal:dumling:Lemma:en/Lexeme/VERB",
	language: "en",
} as const satisfies EnglishVerbLemmaDescriptor;
void swappedEntityDescriptor;

type ProveCompatibilityOutput<Descriptor, Output> = Equal<
	CompatibilityOutput<Descriptor>,
	Output
>;
type _NarrowedCompatibilityOutputMustFail = Assert<
	// @ts-expect-error A generated route cannot be rebound to a narrowed output.
	ProveCompatibilityOutput<
		EnglishVerbLemmaDescriptor,
		Lemma<"en"> & { readonly proofOnly: true }
	>
>;

type ActualGermanLemmaRecordSchema =
	(typeof canonicalDumdictValidationSchemas)["parseAsLemmaRecord:de"];
type ActualEnglishLemmaRecordSchema =
	(typeof canonicalDumdictValidationSchemas)["parseAsLemmaRecord:en"];

type _ActualGermanLemmaRecordIsBoundToItsRoute = Assert<
	ProveCanonicalDumdictValidationSchemaRoute<
		"parseAsLemmaRecord:de",
		ActualGermanLemmaRecordSchema
	>
>;
type _SwappedLanguageSchemaMustFail =
	ProveCanonicalDumdictValidationSchemaRoute<
		"parseAsLemmaRecord:de",
		// @ts-expect-error English payloads cannot back the German parser route.
		ActualEnglishLemmaRecordSchema
	>;

const narrowedGermanLemmaRecordSchema = canonicalDumdictValidationSchemas[
	"parseAsLemmaRecord:de"
].extend({
	proofOnly: z.literal(true),
});
type _NarrowedActualSchemaMustFail = Assert<
	// @ts-expect-error A narrowed schema cannot replace the exact canonical route.
	ProveCanonicalDumdictValidationSchemaRoute<
		"parseAsLemmaRecord:de",
		typeof narrowedGermanLemmaRecordSchema
	>
>;

declare const actualGermanLemmaRecordSchema: CanonicalDumdictValidationSchemaForRoute<"parseAsLemmaRecord:de">;
void actualGermanLemmaRecordSchema;

type CanonicalOutputMap = {
	[Key in DumdictValidationRouteKey]: z.output<
		(typeof canonicalDumdictValidationSchemas)[Key]
	>;
};
type CanonicalInputMap = {
	[Key in DumdictValidationRouteKey]: z.input<
		(typeof canonicalDumdictValidationSchemas)[Key]
	>;
};
type _ActualSchemasMatchIndependentFrozenOutputs = Assert<
	Equal<CanonicalOutputMap, DumdictValidationRouteOutputMap>
>;
type _ActualSchemaMapMatchesRouteDerivedOutputs = Assert<
	Equal<CanonicalOutputMap, ActualDumdictValidationRouteOutputMap>
>;
type _ActualSchemaInputsMatchEveryRoute = Assert<
	Equal<CanonicalInputMap, DumdictValidationRouteInputMap>
>;

const unknownInput: unknown = {};
const germanLemmaRecord = dumdict.parseAsLemmaRecord(unknownInput, "de");
germanLemmaRecord satisfies
	| LemmaRecord<"de">
	| ParsingErrorType<LemmaRecord<"de">>;
// @ts-expect-error A concrete German route cannot widen to an English payload.
germanLemmaRecord satisfies
	| LemmaRecord<"en">
	| ParsingErrorType<LemmaRecord<"en">>;

declare const englishRecord: LemmaRecord<"en">;
// @ts-expect-error Cross-language route payloads remain nominally distinct.
const germanRecord: LemmaRecord<"de"> = englishRecord;
void germanRecord;
