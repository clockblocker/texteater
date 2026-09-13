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

export type InternalDumdictOwnedValidationRouteKey =
	| "internal:knowledge-change"
	| `internal:knowledge-change:bucket:${
			| "definition"
			| "lexical-breakdown"
			| "morphological-tree"
			| "semantic-relations"
			| "transcription"
			| "translations"}`
	| `internal:knowledge-change:retract:${
			| "definition"
			| "lexical-breakdown"
			| "morphological-tree"
			| "semantic-relations"
			| "transcription"
			| "translations"}`
	| "internal:pending-semantic-relation"
	| `internal:reading:${Dumling.Language}`
	| "internal:reading-knowledge"
	| `internal:surface:${Dumling.Language}`;

export type InternalDumdictValidationRouteKey =
	InternalDumdictOwnedValidationRouteKey;

export type InternalDumdictValidationRouteOutputMap = {
	"internal:knowledge-change": Dumrel.KnowledgeChange;
	"internal:knowledge-change:bucket:definition": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "definition"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:lexical-breakdown": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "lexicalBreakdown"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:morphological-tree": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "morphologicalTree"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:semantic-relations": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "semanticRelations"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:transcription": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "transcription"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:translations": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "translations"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:retract:definition": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "definition"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:lexical-breakdown": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "lexicalBreakdown"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:morphological-tree": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "morphologicalTree"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:semantic-relations": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "semanticRelations"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:transcription": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "transcription"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:translations": Extract<
		Dumrel.KnowledgeChange,
		{ aspect: "translations"; kind: "Retract" }
	>;
	"internal:pending-semantic-relation": Dumrel.PendingSemanticRelation;
	"internal:reading:de": ReadingEntry<"de">["reading"];
	"internal:reading:en": ReadingEntry<"en">["reading"];
	"internal:reading:he": ReadingEntry<"he">["reading"];
	"internal:reading-knowledge": Dumrel.ReadingKnowledge;
	"internal:surface:de": SurfaceEntry<"de">["surface"];
	"internal:surface:en": SurfaceEntry<"en">["surface"];
	"internal:surface:he": SurfaceEntry<"he">["surface"];
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
