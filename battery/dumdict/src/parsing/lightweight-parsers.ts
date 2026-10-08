import {
	hasRoot,
	ParsingError,
	type ParsingIssue,
	parseCompiledValidation,
} from "common-utils/validation";
import type * as Dumling from "dumling/types";
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
	if (!hasRoot(validationRegistry, key))
		return new ParsingError([
			{
				code: "custom",
				path: [],
				message: `Unknown Dumdict validation route ${key}`,
			},
		]);
	const recursiveIssue = recursiveInputIssueForRoute(input, key);
	if (recursiveIssue) return new ParsingError([recursiveIssue]);
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
export function parsePendingSemanticRelationForDumdictRuntime(
	input: unknown,
): DumdictParse<
	InternalDumdictValidationRouteOutput<"internal:pending-semantic-relation">
> {
	return parseRoute(input, "internal:pending-semantic-relation");
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
const MAX_DUMDICT_RECURSIVE_INPUT_DEPTH = 128;

function recursiveInputIssueForRoute(
	input: unknown,
	key: DumdictValidationRouteKey | InternalDumdictValidationRouteKey,
): ParsingIssue | undefined {
	if (!routeCanContainMorphologicalTree(key)) return undefined;
	for (const candidate of morphologicalTreeRoots(input)) {
		const issue = recursiveTreeIssue(candidate.value, candidate.path, []);
		if (issue !== undefined) return issue;
	}
	return undefined;
}

export function routeCanContainMorphologicalTree(
	key: DumdictValidationRouteKey | InternalDumdictValidationRouteKey,
): boolean {
	return (
		key.startsWith("parseAsCommitChangesRequest:") ||
		key.startsWith("parseAsDumdictPlan:") ||
		key.startsWith("parseAsPlannedChangeOp:") ||
		key.startsWith("parseAsReadingEntry:") ||
		key.startsWith("parseAsReadingPatchOp:") ||
		key === "internal:knowledge-change" ||
		key === "internal:reading-knowledge"
	);
}

function morphologicalTreeRoots(
	input: unknown,
): Array<{ path: ParsingIssue["path"]; value: unknown }> {
	const roots: Array<{ path: ParsingIssue["path"]; value: unknown }> = [];
	const pending: Array<{ path: ParsingIssue["path"]; value: unknown }> = [
		{ path: [], value: input },
	];
	const seen = new WeakSet<object>();
	for (let index = 0; index < pending.length; index += 1) {
		const candidate = pending[index];
		if (
			candidate === undefined ||
			candidate.value === null ||
			typeof candidate.value !== "object" ||
			seen.has(candidate.value)
		)
			continue;
		seen.add(candidate.value);
		const value = candidate.value;
		if (Reflect.get(value, "aspect") === "morphologicalTree") {
			const changeValue = Reflect.get(value, "value");
			if (changeValue !== null && typeof changeValue === "object") {
				roots.push({
					path: [...candidate.path, "value", "root"],
					value: Reflect.get(changeValue, "root"),
				});
			}
		}
		const storedTree = Reflect.get(value, "morphologicalTree");
		if (storedTree !== null && typeof storedTree === "object") {
			roots.push({
				path: [...candidate.path, "morphologicalTree", "root"],
				value: Reflect.get(storedTree, "root"),
			});
		}
		for (const key of [
			"change",
			"envelope",
			"knowledge",
			"record",
		] as const) {
			const child = Reflect.get(value, key);
			if (child !== null && typeof child === "object")
				pending.push({ path: [...candidate.path, key], value: child });
		}
		for (const key of ["changes", "ops"] as const) {
			const children = Reflect.get(value, key);
			if (!Array.isArray(children)) continue;
			for (const [childIndex, child] of children.entries()) {
				pending.push({
					path: [...candidate.path, key, childIndex],
					value: child,
				});
			}
		}
	}
	return roots;
}

function recursiveTreeIssue(
	value: unknown,
	path: ParsingIssue["path"],
	activeAncestors: object[],
): ParsingIssue | undefined {
	if (value === null || typeof value !== "object") return undefined;
	if (activeAncestors.length >= MAX_DUMDICT_RECURSIVE_INPUT_DEPTH) {
		return {
			code: "custom",
			message: "Input nesting exceeds the supported depth",
			path,
		};
	}
	if (activeAncestors.includes(value)) {
		return {
			code: "custom",
			message: "Cyclic input is not supported",
			path,
		};
	}
	activeAncestors.push(value);
	try {
		if (Array.isArray(value)) {
			for (const [index, child] of value.entries()) {
				const issue = recursiveTreeIssue(
					child,
					[...path, index],
					activeAncestors,
				);
				if (issue !== undefined) return issue;
			}
			return undefined;
		}
		const children = Reflect.get(value, "children");
		if (!Array.isArray(children)) return undefined;
		return recursiveTreeIssue(
			children,
			[...path, "children"],
			activeAncestors,
		);
	} finally {
		activeAncestors.pop();
	}
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

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
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

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
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

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsPlannedChangeOp<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<PlannedChangeOp<Language>> {
	return parseLanguageRoute(input, "parseAsPlannedChangeOp", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsReadingEntry<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): DumdictParse<ReadingEntry<Language>> {
	return parseLanguageRoute(input, "parseAsReadingEntry", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
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
