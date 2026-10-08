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

type LanguageParserName =
	| "parseAsChangePrecondition"
	| "parseAsCommitChangesRequest"
	| "parseAsDumdictPlan"
	| "parseAsLemmaRecord"
	| "parseAsPendingSemanticRelationLocator"
	| "parseAsPendingSemanticRelationRecord"
	| "parseAsPlannedChangeOp"
	| "parseAsReadingEntry"
	| "parseAsReadingPatchOp"
	| "parseAsSurfaceEntry";

export type DumdictValidationRouteKey =
	| `${LanguageParserName}:${Dumling.Language}`
	| "parseAsCommitChangesResult";

type InternalDumdictOwnedValidationRouteKey =
	| "internal:knowledge-change"
	| "internal:pending-semantic-relation"
	| `internal:reading:${Dumling.Language}`
	| "internal:reading-knowledge";

export type InternalDumdictValidationRouteKey =
	InternalDumdictOwnedValidationRouteKey;

type InternalDumdictValidationRouteOutputMap = {
	"internal:knowledge-change": Dumrel.KnowledgeChange;
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
	Key extends `parseAsChangePrecondition:${infer Language extends Dumling.Language}`
		? ChangePrecondition<Language>
		: Key extends `parseAsCommitChangesRequest:${infer Language extends Dumling.Language}`
			? CommitChangesRequest<Language>
			: Key extends "parseAsCommitChangesResult"
				? CommitChangesResult
				: Key extends `parseAsDumdictPlan:${infer Language extends Dumling.Language}`
					? DumdictPlan<Language>
					: Key extends `parseAsLemmaRecord:${infer Language extends Dumling.Language}`
						? LemmaRecord<Language>
						: Key extends `parseAsPendingSemanticRelationLocator:${infer Language extends Dumling.Language}`
							? PendingSemanticRelationLocator<Language>
							: Key extends `parseAsPendingSemanticRelationRecord:${infer Language extends Dumling.Language}`
								? PendingSemanticRelationRecord<Language>
								: Key extends `parseAsPlannedChangeOp:${infer Language extends Dumling.Language}`
									? PlannedChangeOp<Language>
									: Key extends `parseAsReadingEntry:${infer Language extends Dumling.Language}`
										? ReadingEntry<Language>
										: Key extends `parseAsReadingPatchOp:${infer Language extends Dumling.Language}`
											? ReadingPatchOp<Language>
											: Key extends `parseAsSurfaceEntry:${infer Language extends Dumling.Language}`
												? SurfaceEntry<Language>
												: never;

export type DumdictValidationRouteOutputMap = {
	[Key in DumdictValidationRouteKey]: FrozenOutputForRoute<Key>;
};

export type DumdictValidationRouteOutput<
	Key extends DumdictValidationRouteKey,
> = DumdictValidationRouteOutputMap[Key];
