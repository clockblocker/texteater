import type {
	Equal,
	Expect,
	ParsingError as ParsingErrorType,
} from "common-utils";

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

type ActualGermanLemmaRecordSchema =
	(typeof canonicalDumdictValidationSchemas)["parseAsLemmaRecord:de"];
type ActualEnglishLemmaRecordSchema =
	(typeof canonicalDumdictValidationSchemas)["parseAsLemmaRecord:en"];

type _ActualGermanLemmaRecordIsBoundToItsRoute = Expect<
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
type _NarrowedActualSchemaMustFail = Expect<
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
type _ActualSchemasMatchIndependentFrozenOutputs = Expect<
	Equal<CanonicalOutputMap, DumdictValidationRouteOutputMap>
>;
type _ActualSchemaMapMatchesRouteDerivedOutputs = Expect<
	Equal<CanonicalOutputMap, ActualDumdictValidationRouteOutputMap>
>;
type _ActualSchemaInputsMatchEveryRoute = Expect<
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
