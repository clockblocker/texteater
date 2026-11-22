import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPlan,
	LemmaRecord,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	SurfaceEntry,
} from "../domain-types.js";

type LanguageParserOutputMap<L extends Dumling.Language> = {
	parseAsChangePrecondition: ChangePrecondition<L>;
	parseAsCommitChangesRequest: CommitChangesRequest<L>;
	parseAsDumdictPlan: DumdictPlan<L>;
	parseAsLemmaRecord: LemmaRecord<L>;
	parseAsPendingSemanticRelationLocator: PendingSemanticRelationLocator<L>;
	parseAsPendingSemanticRelationRecord: PendingSemanticRelationRecord<L>;
	parseAsPlannedChangeOp: PlannedChangeOp<L>;
	parseAsReadingEntry: ReadingEntry<L>;
	parseAsReadingPatchOp: ReadingPatchOp<L>;
	parseAsSurfaceEntry: SurfaceEntry<L>;
};

export type LanguageParserName =
	keyof LanguageParserOutputMap<Dumling.Language>;

export type LanguageParserOutput<
	Name extends LanguageParserName,
	Language extends Dumling.Language,
> = LanguageParserOutputMap<Language>[Name];

export type DumdictValidationRouteKey =
	| `${LanguageParserName}:${Dumling.Language}`
	| "parseAsCommitChangesResult";

type InternalDumdictOwnedValidationRouteKey =
	| "internal:knowledge-change"
	| "internal:paradigm-change"
	| "internal:pending-semantic-relation"
	| `internal:reading:${Dumling.Language}`
	| "internal:reading-knowledge";

export type InternalDumdictValidationRouteKey =
	InternalDumdictOwnedValidationRouteKey;

type InternalDumdictValidationRouteOutputMap = {
	"internal:knowledge-change": Dumrel.KnowledgeChange;
	"internal:paradigm-change": Dumrel.ParadigmChange;
	"internal:pending-semantic-relation": Dumrel.PendingSemanticRelation;
	"internal:reading:de": ReadingEntry<"de">["reading"];
	"internal:reading:en": ReadingEntry<"en">["reading"];
	"internal:reading:he": ReadingEntry<"he">["reading"];
	"internal:reading-knowledge": Dumrel.ReadingKnowledge;
};

export type InternalDumdictValidationRouteOutput<
	Key extends InternalDumdictValidationRouteKey,
> = InternalDumdictValidationRouteOutputMap[Key];

type FrozenOutputForRoute<Key extends DumdictValidationRouteKey> =
	Key extends "parseAsCommitChangesResult"
		? CommitChangesResult
		: Key extends `${infer Name extends LanguageParserName}:${infer Language extends Dumling.Language}`
			? LanguageParserOutput<Name, Language>
			: never;

export type DumdictValidationRouteOutputMap = {
	[Key in DumdictValidationRouteKey]: FrozenOutputForRoute<Key>;
};

export type DumdictValidationRouteOutput<
	Key extends DumdictValidationRouteKey,
> = DumdictValidationRouteOutputMap[Key];
