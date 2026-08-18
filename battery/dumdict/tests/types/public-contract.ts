import type { Reading as DumlingReading } from "dumling/types";
import type { z } from "zod/v4";
import type * as Dumdict from "../../src";

declare const canonicalReading: DumlingReading<"en">;
canonicalReading satisfies Dumdict.Reading<"en">;
declare const reexportedReading: Dumdict.Reading<"en">;
reexportedReading satisfies DumlingReading<"en">;

// @ts-expect-error Dumling Attestation is not Dumdict-owned vocabulary.
type Attestation = Dumdict.Attestation;

void (undefined as unknown as Attestation);

declare const inspection: Dumdict.DumlingIdInspection;
const identityBearingKind: "Lemma" | "Surface" = inspection.kind;
void identityBearingKind;

declare const serializedNote: Dumdict.SerializedDictionaryNote<"en">;
const schemaVersion: 1 = serializedNote.schemaVersion;
void schemaVersion;

declare const plan: Dumdict.DumdictPlan<"en">;
// @ts-expect-error Public Dumdict plans are readonly at the host seam.
plan.baseRevision = "changed" as Dumdict.StoreRevision;
// @ts-expect-error Hosts cannot add unvalidated changes to a Dumdict plan.
plan.changes.push();
// @ts-expect-error Hosts cannot alter a planned change after validation.
plan.changes[0]?.preconditions.push();

declare const germanSchemas: Dumdict.DumdictSchemasFor<"de">;
type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Expect<Value extends true> = Value;
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type DeepReadonly<Value> = Value extends Primitive
	? Value
	: Value extends (...args: never[]) => unknown
		? Value
		: Value extends readonly unknown[]
			? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
			: Value extends object
				? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
				: Value;
type SchemaOutput<Key extends keyof typeof germanSchemas> = z.output<
	(typeof germanSchemas)[Key]
>;

type _LemmaRecordComesFromSchema = Expect<
	Equal<Dumdict.LemmaRecord<"de">, SchemaOutput<"lemmaRecordSchema">>
>;
type _ReadingEntryComesFromSchema = Expect<
	Equal<Dumdict.ReadingEntry<"de">, SchemaOutput<"readingEntrySchema">>
>;
type _SurfaceEntryComesFromSchema = Expect<
	Equal<Dumdict.SurfaceEntry<"de">, SchemaOutput<"surfaceEntrySchema">>
>;
type _PendingLocatorComesFromSchema = Expect<
	Equal<
		Dumdict.PendingSemanticRelationLocator<"de">,
		SchemaOutput<"pendingSemanticRelationLocatorSchema">
	>
>;
type _PendingRecordComesFromSchema = Expect<
	Equal<
		Dumdict.PendingSemanticRelationRecord<"de">,
		SchemaOutput<"pendingSemanticRelationRecordSchema">
	>
>;
type _PendingValueComesFromSchema = Expect<
	Equal<
		Dumdict.DumdictPendingSemanticRelation<"de">,
		SchemaOutput<"pendingSemanticRelationRecordSchema">["pending"]
	>
>;
type _PreconditionComesFromSchema = Expect<
	Equal<
		Dumdict.ChangePrecondition<"de">,
		SchemaOutput<"changePreconditionSchema">
	>
>;
type _PatchOpComesFromSchema = Expect<
	Equal<Dumdict.ReadingPatchOp<"de">, SchemaOutput<"readingPatchOpSchema">>
>;
type _PlannedChangeComesFromSchema = Expect<
	Equal<Dumdict.PlannedChangeOp<"de">, SchemaOutput<"plannedChangeOpSchema">>
>;
type _CommitResultComesFromSchema = Expect<
	Equal<
		Dumdict.CommitChangesResult,
		z.output<typeof Dumdict.commitChangesResultSchema>
	>
>;
type ParsedCommitRequest = SchemaOutput<"commitChangesRequestSchema">;
type ExpectedCommitRequest = Readonly<{
	[Key in keyof ParsedCommitRequest]: Key extends "changes"
		? Readonly<ParsedCommitRequest[Key]>
		: ParsedCommitRequest[Key];
}>;
type _CommitRequestComesFromSchema = Expect<
	Equal<Dumdict.CommitChangesRequest<"de">, ExpectedCommitRequest>
>;
type _PlanComesFromSchema = Expect<
	Equal<
		Dumdict.DumdictPlan<"de">,
		DeepReadonly<SchemaOutput<"dumdictPlanSchema">>
	>
>;
type _ConflictCodeComesFromSchema = Expect<
	Equal<
		Dumdict.CommitConflictCode,
		z.output<typeof Dumdict.commitConflictCodeSchema>
	>
>;
type _AggregateTracksEverySupportedLanguage = Expect<
	Equal<
		z.output<typeof Dumdict.lemmaRecordSchema>["lemma"]["language"],
		Dumdict.SupportedLanguage
	>
>;

type ParsedGermanLemmaRecord = SchemaOutput<"lemmaRecordSchema">;
declare const parsedGermanLemmaRecord: ParsedGermanLemmaRecord;
parsedGermanLemmaRecord satisfies Dumdict.LemmaRecord<"de">;
// @ts-expect-error The language-scoped schema output retains its language.
parsedGermanLemmaRecord satisfies Dumdict.LemmaRecord<"he">;
