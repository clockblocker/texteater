import type {
	Attestation,
	Lemma,
	SupportedLanguage,
	Surface,
} from "dumling/types";
import type {
	KnowledgeChange,
	PendingSemanticRelation,
	ReadingKnowledge,
} from "dumrel/types";
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
	| `${LanguageParserName}:${SupportedLanguage}`
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
	| `internal:reading:${SupportedLanguage}`
	| "internal:reading-knowledge"
	| `internal:surface:${SupportedLanguage}`;

type InternalDumlingCompatibilityValidationRouteKey =
	`internal:dumling:${"Attestation" | "Lemma" | "Surface"}:${SupportedLanguage}/${string}`;

export type InternalDumdictValidationRouteKey =
	| InternalDumdictOwnedValidationRouteKey
	| InternalDumlingCompatibilityValidationRouteKey;

export type InternalDumdictValidationRouteOutputMap = {
	"internal:knowledge-change": KnowledgeChange;
	"internal:knowledge-change:bucket:definition": Extract<
		KnowledgeChange,
		{ aspect: "definition"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:lexical-breakdown": Extract<
		KnowledgeChange,
		{ aspect: "lexicalBreakdown"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:morphological-tree": Extract<
		KnowledgeChange,
		{ aspect: "morphologicalTree"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:semantic-relations": Extract<
		KnowledgeChange,
		{ aspect: "semanticRelations"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:transcription": Extract<
		KnowledgeChange,
		{ aspect: "transcription"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:bucket:translations": Extract<
		KnowledgeChange,
		{ aspect: "translations"; kind: "Contribute" | "Correct" }
	>;
	"internal:knowledge-change:retract:definition": Extract<
		KnowledgeChange,
		{ aspect: "definition"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:lexical-breakdown": Extract<
		KnowledgeChange,
		{ aspect: "lexicalBreakdown"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:morphological-tree": Extract<
		KnowledgeChange,
		{ aspect: "morphologicalTree"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:semantic-relations": Extract<
		KnowledgeChange,
		{ aspect: "semanticRelations"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:transcription": Extract<
		KnowledgeChange,
		{ aspect: "transcription"; kind: "Retract" }
	>;
	"internal:knowledge-change:retract:translations": Extract<
		KnowledgeChange,
		{ aspect: "translations"; kind: "Retract" }
	>;
	"internal:pending-semantic-relation": PendingSemanticRelation;
	"internal:reading:de": ReadingEntry<"de">["reading"];
	"internal:reading:en": ReadingEntry<"en">["reading"];
	"internal:reading:he": ReadingEntry<"he">["reading"];
	"internal:reading-knowledge": ReadingKnowledge;
	"internal:surface:de": SurfaceEntry<"de">["surface"];
	"internal:surface:en": SurfaceEntry<"en">["surface"];
	"internal:surface:he": SurfaceEntry<"he">["surface"];
};

export type InternalDumdictValidationRouteOutput<
	Key extends InternalDumdictValidationRouteKey,
> = Key extends keyof InternalDumdictValidationRouteOutputMap
	? InternalDumdictValidationRouteOutputMap[Key]
	: Key extends `internal:dumling:Lemma:${infer Language extends SupportedLanguage}/${string}`
		? Lemma<Language>
		: Key extends `internal:dumling:Surface:${infer Language extends SupportedLanguage}/${string}`
			? Surface<Language>
			: Key extends `internal:dumling:Attestation:${infer Language extends SupportedLanguage}/${string}`
				? Attestation<Language>
				: never;

type FrozenOutputForRoute<Key extends DumdictValidationRouteKey> =
	Key extends `parseAsChangePrecondition:${infer Language extends SupportedLanguage}`
		? ChangePrecondition<Language>
		: Key extends `parseAsCommitChangesRequest:${infer Language extends SupportedLanguage}`
			? CommitChangesRequest<Language>
			: Key extends "parseAsCommitChangesResult"
				? CommitChangesResult
				: Key extends `parseAsDumdictPlan:${infer Language extends SupportedLanguage}`
					? DumdictPlan<Language>
					: Key extends `parseAsLemmaRecord:${infer Language extends SupportedLanguage}`
						? LemmaRecord<Language>
						: Key extends `parseAsPendingSemanticRelationLocator:${infer Language extends SupportedLanguage}`
							? PendingSemanticRelationLocator<Language>
							: Key extends `parseAsPendingSemanticRelationRecord:${infer Language extends SupportedLanguage}`
								? PendingSemanticRelationRecord<Language>
								: Key extends `parseAsPlannedChangeOp:${infer Language extends SupportedLanguage}`
									? PlannedChangeOp<Language>
									: Key extends `parseAsReadingEntry:${infer Language extends SupportedLanguage}`
										? ReadingEntry<Language>
										: Key extends `parseAsReadingPatchOp:${infer Language extends SupportedLanguage}`
											? ReadingPatchOp<Language>
											: Key extends `parseAsSurfaceEntry:${infer Language extends SupportedLanguage}`
												? SurfaceEntry<Language>
												: never;

export type DumdictValidationRouteOutputMap = {
	[Key in DumdictValidationRouteKey]: FrozenOutputForRoute<Key>;
};

export type DumdictValidationRouteOutput<
	Key extends DumdictValidationRouteKey,
> = DumdictValidationRouteOutputMap[Key];
