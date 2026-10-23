import {
	hasRoot,
	ParsingError,
	parseCompiledValidation,
} from "common-utils/validation";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPendingSemanticRelation,
	DumdictPlan,
	LemmaRecord,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	SurfaceEntry,
} from "../domain-types.js";
import { validationRegistry } from "../generated/linked-validation.js";
import { dumdictValidationOperations } from "./validation-operations.js";
import type {
	DumdictValidationRouteKey,
	DumdictValidationRouteOutput,
	InternalDumdictValidationRouteKey,
	InternalDumdictValidationRouteOutput,
} from "./validation-route-types.js";

export { ParsingError };

/** A Dumdict parser's result: the parsed value, or the error saying why it failed. */
export type DumdictParse<T> = T | ParsingError<T>;
export function unwrapDumdictParse<T>(parsed: DumdictParse<T>): T {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}
type RouteKey = DumdictValidationRouteKey | InternalDumdictValidationRouteKey;
function parseRoute<T>(input: unknown, key: RouteKey): DumdictParse<T> {
	// Typed, every RouteKey is a root; the check guards a registry that has
	// drifted from the route types, so it reads the key as a plain string.
	const route: string = key;
	if (!hasRoot(validationRegistry, route))
		return new ParsingError([
			{
				code: "custom",
				path: [],
				message: `Unknown Dumdict validation route ${route}`,
			},
		]);
	return parseCompiledValidation<RouteKey, T>(
		validationRegistry,
		key,
		input,
		dumdictValidationOperations,
	);
}
function parseDumdictRoute<Key extends DumdictValidationRouteKey>(
	input: unknown,
	key: Key,
): DumdictParse<DumdictValidationRouteOutput<Key>> {
	return parseRoute(input, key);
}
export function parseKnowledgeChangeForDumdictRuntime(
	input: unknown,
): DumdictParse<
	InternalDumdictValidationRouteOutput<"internal:knowledge-change">
> {
	return parseRoute(input, "internal:knowledge-change");
}
/** A Paradigm Change's shape; Dumrel checks it against its Lemma. */
export function parseParadigmChangeForDumdictRuntime(
	input: unknown,
): DumdictParse<
	InternalDumdictValidationRouteOutput<"internal:paradigm-change">
> {
	return parseRoute(input, "internal:paradigm-change");
}
export function parsePendingSemanticRelationForDumdictRuntime(
	input: unknown,
): DumdictParse<
	InternalDumdictValidationRouteOutput<"internal:pending-semantic-relation">
> {
	return parseRoute(input, "internal:pending-semantic-relation");
}
/** Whether a Pending Semantic Relation's target uses the dictionary's language. */
export function pendingTargetsLanguage<L extends Dumling.Language>(
	pending: Dumrel.PendingSemanticRelation,
	language: L,
): pending is DumdictPendingSemanticRelation<L> {
	return pending.target.language === language;
}
/**
 * Parses a Pending Semantic Relation whose target language its caller has
 * already checked, so a mismatch here is a defect.
 */
export function parsePendingSemanticRelationInLanguage<
	L extends Dumling.Language,
>(input: unknown, language: L): DumdictPendingSemanticRelation<L> {
	const pending = unwrapDumdictParse(
		parsePendingSemanticRelationForDumdictRuntime(input),
	);
	if (!pendingTargetsLanguage(pending, language))
		throw new Error(
			"Pending Semantic Relation target language does not match the dictionary.",
		);
	return pending;
}
export function parseReadingKnowledgeForDumdictRuntime(
	input: unknown,
): DumdictParse<
	InternalDumdictValidationRouteOutput<"internal:reading-knowledge">
> {
	return parseRoute(input, "internal:reading-knowledge");
}
export function parseReadingForDumdictRuntime<L extends Dumling.Language>(
	input: unknown,
	language: L,
): DumdictParse<Dumling.Reading<L>> {
	return parseRoute(input, `internal:reading:${language}`);
}
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

type LanguageParserOutput<
	Name extends LanguageParserName,
	Language extends Dumling.Language,
> = Name extends "parseAsChangePrecondition"
	? ChangePrecondition<Language>
	: Name extends "parseAsCommitChangesRequest"
		? CommitChangesRequest<Language>
		: Name extends "parseAsDumdictPlan"
			? DumdictPlan<Language>
			: Name extends "parseAsLemmaRecord"
				? LemmaRecord<Language>
				: Name extends "parseAsPendingSemanticRelationLocator"
					? PendingSemanticRelationLocator<Language>
					: Name extends "parseAsPendingSemanticRelationRecord"
						? PendingSemanticRelationRecord<Language>
						: Name extends "parseAsPlannedChangeOp"
							? PlannedChangeOp<Language>
							: Name extends "parseAsReadingEntry"
								? ReadingEntry<Language>
								: Name extends "parseAsReadingPatchOp"
									? ReadingPatchOp<Language>
									: SurfaceEntry<Language>;

function parseLanguageRoute<
	Name extends LanguageParserName,
	Language extends Dumling.Language,
>(
	input: unknown,
	name: Name,
	language: Language,
): DumdictParse<LanguageParserOutput<Name, Language>> {
	const parsed = (() => {
		switch (language) {
			case "de":
				return parseDumdictRoute(input, `${name}:de`);
			case "en":
				return parseDumdictRoute(input, `${name}:en`);
			case "he":
				return parseDumdictRoute(input, `${name}:he`);
		}
	})();
	// The generated route proof binds every concrete key to its actual canonical
	// z.output. TypeScript cannot reduce the same mapping for a generic language,
	// so this is the sole parser-internal reconstruction of that proven relation.
	return parsed as DumdictParse<LanguageParserOutput<Name, Language>>;
}

export function parseAsChangePrecondition<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<ChangePrecondition<Language>> {
	return parseLanguageRoute(input, "parseAsChangePrecondition", language);
}

export function parseAsCommitChangesRequest<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<CommitChangesRequest<Language>> {
	return parseLanguageRoute(input, "parseAsCommitChangesRequest", language);
}

export function parseAsCommitChangesResult(
	input: unknown,
): DumdictParse<CommitChangesResult> {
	return parseDumdictRoute(input, "parseAsCommitChangesResult");
}

export function parseAsDumdictPlan<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<DumdictPlan<Language>> {
	return parseLanguageRoute(input, "parseAsDumdictPlan", language);
}

export function parseAsLemmaRecord<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<LemmaRecord<Language>> {
	return parseLanguageRoute(input, "parseAsLemmaRecord", language);
}

export function parseAsPendingSemanticRelationLocator<
	Language extends Dumling.Language,
>(
	input: unknown,
	language: Language,
): DumdictParse<PendingSemanticRelationLocator<Language>> {
	return parseLanguageRoute(
		input,
		"parseAsPendingSemanticRelationLocator",
		language,
	);
}

export function parseAsPendingSemanticRelationRecord<
	Language extends Dumling.Language,
>(
	input: unknown,
	language: Language,
): DumdictParse<PendingSemanticRelationRecord<Language>> {
	return parseLanguageRoute(
		input,
		"parseAsPendingSemanticRelationRecord",
		language,
	);
}

export function parseAsPlannedChangeOp<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<PlannedChangeOp<Language>> {
	return parseLanguageRoute(input, "parseAsPlannedChangeOp", language);
}

export function parseAsReadingEntry<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<ReadingEntry<Language>> {
	return parseLanguageRoute(input, "parseAsReadingEntry", language);
}

export function parseAsReadingPatchOp<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<ReadingPatchOp<Language>> {
	return parseLanguageRoute(input, "parseAsReadingPatchOp", language);
}

export function parseAsSurfaceEntry<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<SurfaceEntry<Language>> {
	return parseLanguageRoute(input, "parseAsSurfaceEntry", language);
}
