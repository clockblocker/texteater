import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
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
import { encodedDumdictValidationArtifacts } from "../generated/validation-artifacts.js";
import { dumdictValidationOperations } from "./validation-operations.js";
import type {
	DumdictValidationRouteKey,
	DumdictValidationRouteOutput,
	InternalDumdictValidationRouteKey,
	InternalDumdictValidationRouteOutput,
} from "./validation-route-types.js";

export { ParsingError };

type Parsed<T> = T | ParsingError<T>;
export function unwrapDumdictParse<T>(parsed: Parsed<T>): T {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}
const registry: {
	version: 1;
	roots: Record<string, Constraint>;
	definitions: Record<string, Constraint>;
} = JSON.parse(encodedDumdictValidationArtifacts);
export function decodeDumdictValidationArtifact<
	Key extends DumdictValidationRouteKey,
>(key: Key): ValidationArtifact<DumdictValidationRouteOutput<Key>> {
	const root = registry.roots[key];
	if (!root) throw Error(`Unknown Dumdict validation route ${key}`);
	return { version: 1, root, definitions: registry.definitions };
}
function parseRoute<T>(
	input: unknown,
	key: DumdictValidationRouteKey | InternalDumdictValidationRouteKey,
): Parsed<T> {
	const root = registry.roots[key];
	if (!root)
		return new ParsingError([
			{
				code: "custom",
				path: [],
				message: `Unknown Dumdict validation route ${key}`,
			},
		]);
	const recursiveIssue = recursiveInputIssueForRoute(input, key);
	if (recursiveIssue) return new ParsingError([recursiveIssue]);
	return parseValidationArtifact<T>(
		{ version: 1, root, definitions: registry.definitions },
		input,
		dumdictValidationOperations,
	);
}
function parseDumdictRoute<Key extends DumdictValidationRouteKey>(
	input: unknown,
	key: Key,
): Parsed<DumdictValidationRouteOutput<Key>> {
	return parseRoute(input, key);
}
export function parseKnowledgeChangeForDumdictRuntime(
	input: unknown,
): Parsed<InternalDumdictValidationRouteOutput<"internal:knowledge-change">> {
	return parseRoute(input, "internal:knowledge-change");
}
export function parsePendingSemanticRelationForDumdictRuntime(
	input: unknown,
): Parsed<
	InternalDumdictValidationRouteOutput<"internal:pending-semantic-relation">
> {
	return parseRoute(input, "internal:pending-semantic-relation");
}
export function parseReadingKnowledgeForDumdictRuntime(
	input: unknown,
): Parsed<InternalDumdictValidationRouteOutput<"internal:reading-knowledge">> {
	return parseRoute(input, "internal:reading-knowledge");
}
export function parseReadingForDumdictRuntime<L extends Dumling.Language>(
	input: unknown,
	language: L,
): Parsed<Dumling.Reading<L>> {
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
		key === "internal:knowledge-change:bucket:morphological-tree" ||
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
): Parsed<LanguageParserOutput<Name, Language>> {
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
	return parsed as Parsed<LanguageParserOutput<Name, Language>>;
}

export function parseAsChangePrecondition<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<ChangePrecondition<Language>> {
	return parseLanguageRoute(input, "parseAsChangePrecondition", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsCommitChangesRequest<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<CommitChangesRequest<Language>> {
	return parseLanguageRoute(input, "parseAsCommitChangesRequest", language);
}

export function parseAsCommitChangesResult(
	input: unknown,
): Parsed<CommitChangesResult> {
	return parseDumdictRoute(input, "parseAsCommitChangesResult");
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsDumdictPlan<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<DumdictPlan<Language>> {
	return parseLanguageRoute(input, "parseAsDumdictPlan", language);
}

export function parseAsLemmaRecord<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<LemmaRecord<Language>> {
	return parseLanguageRoute(input, "parseAsLemmaRecord", language);
}

export function parseAsPendingSemanticRelationLocator<
	Language extends Dumling.Language,
>(
	input: unknown,
	language: Language,
): Parsed<PendingSemanticRelationLocator<Language>> {
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
): Parsed<PendingSemanticRelationRecord<Language>> {
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
): Parsed<PlannedChangeOp<Language>> {
	return parseLanguageRoute(input, "parseAsPlannedChangeOp", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsReadingEntry<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<ReadingEntry<Language>> {
	return parseLanguageRoute(input, "parseAsReadingEntry", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsReadingPatchOp<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<ReadingPatchOp<Language>> {
	return parseLanguageRoute(input, "parseAsReadingPatchOp", language);
}

export function parseAsSurfaceEntry<Language extends Dumling.Language>(
	input: unknown,
	language: Language,
): Parsed<SurfaceEntry<Language>> {
	return parseLanguageRoute(input, "parseAsSurfaceEntry", language);
}
