import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import { canonicalizeNullableProperties } from "dumling/id";
import type {
	ApiResult,
	Attestation,
	LanguageApi,
	Lemma,
	ParseError,
	SupportedLanguage,
	Surface,
} from "dumling/types";
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
import { configureDumdictIdParsers } from "../dumling-id.js";
import {
	encodedDumdictValidationArtifacts,
	type GeneratedDumdictValidationRouteKey,
	type GeneratedDumlingCompatibilityValidationRouteDescriptor,
	type GeneratedInternalDumdictValidationRouteKey,
} from "../generated/validation-artifacts.js";
import {
	decodeCompactConstraintPayload,
	resolveCompactExternalString,
} from "./compact-validation-payload.js";
import {
	configureDumdictDiscriminatorBranchParser,
	dumdictValidationOperations,
	resolveDumdictExternalConstraintString,
} from "./validation-operations.js";
import type {
	DumdictValidationRouteKey,
	DumdictValidationRouteOutput,
	InternalDumdictValidationRouteKey,
	InternalDumdictValidationRouteOutput,
} from "./validation-route-types.js";

/**
 * Lightweight parsers return canonical output, including normalization and
 * transforms, or this shared error for caller-controlled invalid input.
 * Language coordinates are authoritative and narrow the success type.
 */
export { ParsingError };

type Parsed<Output> = Output | ParsingError<Output>;

export function unwrapDumdictParse<Output>(
	parsed: Output | ParsingError<Output>,
): Output {
	if (
		parsed instanceof ParsingError ||
		(parsed instanceof Error &&
			parsed.name === "ParsingError" &&
			Array.isArray(Reflect.get(parsed, "issues")))
	)
		throw parsed;
	return parsed;
}

function parseDumdictRoute<Key extends GeneratedDumdictValidationRouteKey>(
	input: unknown,
	key: Key,
): Parsed<DumdictValidationRouteOutput<Key>> {
	const recursiveInputIssue = recursiveInputIssueForRoute(input, key);
	if (recursiveInputIssue !== undefined)
		return new ParsingError([recursiveInputIssue]);
	return parseValidationArtifact(
		decodeDumdictValidationArtifact(key),
		input,
		dumdictValidationOperations,
	);
}

function parseInternalDumdictRoute<
	Key extends GeneratedInternalDumdictValidationRouteKey,
>(input: unknown, key: Key): Parsed<InternalDumdictValidationRouteOutput<Key>> {
	const recursiveInputIssue = recursiveInputIssueForRoute(input, key);
	if (recursiveInputIssue !== undefined)
		return new ParsingError([recursiveInputIssue]);
	// The generated registry proves Key -> canonical output. Keeping the decoder
	// constraint-only prevents TypeScript from materializing the entire private
	// output union (TS2590); this is the sole operational reconstruction cast.
	return parseValidationArtifact(
		decodeInternalDumdictValidationArtifact(key),
		input,
		dumdictValidationOperations,
	) as Parsed<InternalDumdictValidationRouteOutput<Key>>;
}

const MAX_DUMDICT_RECURSIVE_INPUT_DEPTH = 128;

function recursiveInputIssueForRoute(
	input: unknown,
	key:
		| GeneratedDumdictValidationRouteKey
		| GeneratedInternalDumdictValidationRouteKey,
): ParsingIssue | undefined {
	if (!routeCanContainMorphologicalTree(key)) return undefined;
	for (const candidate of morphologicalTreeRoots(input)) {
		const issue = recursiveTreeIssue(candidate.value, candidate.path, []);
		if (issue !== undefined) return issue;
	}
	return undefined;
}

export function routeCanContainMorphologicalTree(
	key:
		| GeneratedDumdictValidationRouteKey
		| GeneratedInternalDumdictValidationRouteKey,
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

export function parseKnowledgeChangeForDumdictRuntime(
	input: unknown,
): Parsed<InternalDumdictValidationRouteOutput<"internal:knowledge-change">> {
	const branch = knowledgeChangeBranchRoute(input);
	if (branch !== undefined) {
		const parsed = parseInternalDumdictRoute(input, branch);
		if (!(parsed instanceof ParsingError)) {
			return parsed as InternalDumdictValidationRouteOutput<"internal:knowledge-change">;
		}
	}
	return parseInternalDumdictRoute(input, "internal:knowledge-change");
}

type KnowledgeChangeBranchRoute = Extract<
	GeneratedInternalDumdictValidationRouteKey,
	`internal:knowledge-change:${"bucket" | "retract"}:${string}`
>;

function knowledgeChangeBranchRoute(
	input: unknown,
): KnowledgeChangeBranchRoute | undefined {
	if (input === null || typeof input !== "object") return undefined;
	const kind = Reflect.get(input, "kind");
	const prefix =
		kind === "Retract"
			? "retract"
			: kind === "Contribute" || kind === "Correct"
				? "bucket"
				: undefined;
	if (prefix === undefined) return undefined;
	switch (Reflect.get(input, "aspect")) {
		case "definition":
			return `internal:knowledge-change:${prefix}:definition`;
		case "lexicalBreakdown":
			return `internal:knowledge-change:${prefix}:lexical-breakdown`;
		case "morphologicalTree":
			return `internal:knowledge-change:${prefix}:morphological-tree`;
		case "semanticRelations":
			return `internal:knowledge-change:${prefix}:semantic-relations`;
		case "transcription":
			return `internal:knowledge-change:${prefix}:transcription`;
		case "translations":
			return `internal:knowledge-change:${prefix}:translations`;
		default:
			return undefined;
	}
}

export function parsePendingSemanticRelationForDumdictRuntime(
	input: unknown,
): Parsed<
	InternalDumdictValidationRouteOutput<"internal:pending-semantic-relation">
> {
	return parseInternalDumdictRoute(
		input,
		"internal:pending-semantic-relation",
	);
}

export function parseReadingKnowledgeForDumdictRuntime(
	input: unknown,
): Parsed<InternalDumdictValidationRouteOutput<"internal:reading-knowledge">> {
	return parseInternalDumdictRoute(input, "internal:reading-knowledge");
}

export function parseReadingForDumdictRuntime<
	Language extends SupportedLanguage,
>(
	input: unknown,
	language: Language,
): Parsed<
	InternalDumdictValidationRouteOutput<`internal:reading:${Language}`>
> {
	const parsed = (() => {
		switch (language) {
			case "de":
				return parseInternalDumdictRoute(input, "internal:reading:de");
			case "en":
				return parseInternalDumdictRoute(input, "internal:reading:en");
			case "he":
				return parseInternalDumdictRoute(input, "internal:reading:he");
		}
	})();
	return parsed as Parsed<
		InternalDumdictValidationRouteOutput<`internal:reading:${Language}`>
	>;
}

function parseCompatibilityLemma<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<Lemma<Language>> {
	return parseDumlingCompatibilityEntityRoute(
		input,
		`Lemma:${language}/${stringField(input, "family")}/${stringField(input, "kind")}`,
	) as Parsed<Lemma<Language>>;
}

function parseCompatibilitySurface<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<Surface<Language>> {
	const lemma = nestedRecord(input, "lemma");
	return parseDumlingCompatibilityEntityRoute(
		input,
		`Surface:${language}/${stringField(input, "surfaceKind")}/${stringField(lemma, "family")}/${stringField(lemma, "kind")}`,
	) as Parsed<Surface<Language>>;
}

function parseCompatibilityAttestation<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<Attestation<Language>> {
	const surface = nestedRecord(input, "surface");
	const lemma = nestedRecord(surface, "lemma");
	return parseDumlingCompatibilityEntityRoute(
		input,
		`Attestation:${language}/${stringField(surface, "surfaceKind")}/${stringField(lemma, "family")}/${stringField(lemma, "kind")}`,
	) as Parsed<Attestation<Language>>;
}

type DumlingCompatibilityRouteOutput =
	| Attestation<SupportedLanguage>
	| Lemma<SupportedLanguage>
	| Surface<SupportedLanguage>;

function parseDumlingCompatibilityEntityRoute(
	input: unknown,
	route: `${"Attestation" | "Lemma" | "Surface"}:${string}`,
): Parsed<DumlingCompatibilityRouteOutput> {
	const descriptor = dumlingCompatibilityRouteDescriptor(route);
	if (descriptor === undefined) {
		return new ParsingError<DumlingCompatibilityRouteOutput>([
			{
				code: "custom",
				message: `Unsupported Dumling validation route: ${route}`,
				path: [],
			},
		]);
	}
	// The generated-key lookup above is the runtime half of the codegen proof:
	// only exact canonical leaf routes can reach the typed decoder.
	const artifact = decodeGeneratedDumdictValidationArtifact(descriptor.key);
	return parseValidationArtifact(
		artifact,
		canonicalizeNullableProperties(
			artifact.root,
			artifact.definitions,
			input,
		),
		dumdictValidationOperations,
	) as Parsed<DumlingCompatibilityRouteOutput>;
}

function dumlingCompatibilityRouteDescriptor(
	route: `${"Attestation" | "Lemma" | "Surface"}:${string}`,
): GeneratedDumlingCompatibilityValidationRouteDescriptor | undefined {
	const key = `internal:dumling:${route}`;
	if (rootPayloadFor(key) === undefined) return undefined;
	const entityEnd = route.indexOf(":");
	const languageEnd = route.indexOf("/", entityEnd + 1);
	// The generated root lookup is authoritative. This local reconstruction
	// cannot invent an entity, language, route key, or caller-selected Output.
	return {
		entity: route.slice(0, entityEnd),
		key,
		language: route.slice(entityEnd + 1, languageEnd),
	} as GeneratedDumlingCompatibilityValidationRouteDescriptor;
}

function nestedRecord(value: unknown, key: string): unknown {
	return value !== null && typeof value === "object"
		? Reflect.get(value, key)
		: undefined;
}

function stringField(value: unknown, key: string): string {
	const field = nestedRecord(value, key);
	return typeof field === "string" ? field : "<invalid>";
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
	Language extends SupportedLanguage,
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
	Language extends SupportedLanguage,
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

export function parseAsChangePrecondition<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<ChangePrecondition<Language>> {
	return parseLanguageRoute(input, "parseAsChangePrecondition", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsCommitChangesRequest<Language extends SupportedLanguage>(
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
export function parseAsDumdictPlan<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<DumdictPlan<Language>> {
	return parseLanguageRoute(input, "parseAsDumdictPlan", language);
}

export function parseAsLemmaRecord<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<LemmaRecord<Language>> {
	return parseLanguageRoute(input, "parseAsLemmaRecord", language);
}

export function parseAsPendingSemanticRelationLocator<
	Language extends SupportedLanguage,
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
	Language extends SupportedLanguage,
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
export function parseAsPlannedChangeOp<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<PlannedChangeOp<Language>> {
	return parseLanguageRoute(input, "parseAsPlannedChangeOp", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsReadingEntry<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<ReadingEntry<Language>> {
	return parseLanguageRoute(input, "parseAsReadingEntry", language);
}

/** Rejects cyclic Morphological Trees and nesting beyond 128 as `ParsingError`. */
export function parseAsReadingPatchOp<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<ReadingPatchOp<Language>> {
	return parseLanguageRoute(input, "parseAsReadingPatchOp", language);
}

export function parseAsSurfaceEntry<Language extends SupportedLanguage>(
	input: unknown,
	language: Language,
): Parsed<SurfaceEntry<Language>> {
	return parseLanguageRoute(input, "parseAsSurfaceEntry", language);
}

export function decodeDumdictValidationArtifact<
	Key extends DumdictValidationRouteKey,
>(key: Key): ValidationArtifact<DumdictValidationRouteOutput<Key>> {
	return decodeGeneratedDumdictValidationArtifact(key);
}

function decodeInternalDumdictValidationArtifact(
	key: GeneratedInternalDumdictValidationRouteKey,
): ValidationArtifact<unknown> {
	return decodeGeneratedDumdictValidationArtifact(key);
}

function decodeGeneratedDumdictValidationArtifact(
	key: DumdictValidationRouteKey | InternalDumdictValidationRouteKey,
): Readonly<{
	definitions: Readonly<Record<string, Constraint>>;
	root: Constraint;
	version: 1;
}> {
	const rootPayload = rootPayloadFor(key);
	if (rootPayload === undefined) {
		throw new ReferenceError(
			`Unknown generated Dumdict parser root: ${key}`,
		);
	}
	return {
		definitions: decodedDefinitions,
		root: decodedRoot(key, rootPayload),
		version: encodedDumdictValidationArtifacts.version,
	};
}

const decodedDefinitionCache: Record<string, Constraint> = Object.create(null);
const decodedDefinitionPayloadCache = new Map<string, Constraint>();
const decodedDefinitions: Readonly<Record<string, Constraint>> = new Proxy(
	decodedDefinitionCache,
	{
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			const payload = definitionPayloadAt(
				definitionIndex(property),
				property,
			);
			let constraint = decodedDefinitionPayloadCache.get(payload);
			if (constraint === undefined) {
				constraint = decodeConstraintPayload(payload, property);
				// Failed/corrupt decodes throw above and never enter either cache.
				decodedDefinitionPayloadCache.set(payload, constraint);
			}
			// Failed/corrupt decodes throw above and never enter the cache.
			target[property] = constraint;
			return constraint;
		},
		defineProperty: () => false,
		deleteProperty: () => false,
		set: () => false,
	},
);
const decodedRoots = new Map<string, Constraint>();

configureDumdictDiscriminatorBranchParser((root, input) =>
	parseValidationArtifact(
		{
			definitions: decodedDefinitions,
			root,
			version: encodedDumdictValidationArtifacts.version,
		},
		input,
		dumdictValidationOperations,
	),
);

function decodedRoot(key: string, payload: string): Constraint {
	const cached = decodedRoots.get(key);
	if (cached !== undefined) return cached;
	const decoded = decodeConstraintPayload(payload, key);
	// Failed/corrupt decodes throw above and never enter the cache.
	decodedRoots.set(key, decoded);
	return decoded;
}

function rootPayloadFor(route: string): string | undefined {
	const marker = `\n${route}\0`;
	const markerStart =
		encodedDumdictValidationArtifacts.routeIndexPayload.indexOf(marker);
	if (markerStart < 0) return undefined;
	const offsetStart = markerStart + marker.length;
	const payloadStart = readFixedWidthBase36(
		encodedDumdictValidationArtifacts.routeIndexPayload,
		offsetStart,
	);
	const payloadLength = readFixedWidthBase36(
		encodedDumdictValidationArtifacts.routeIndexPayload,
		offsetStart + encodedDumdictValidationArtifacts.offsetWidth,
	);
	const payloadEnd = payloadStart + payloadLength;
	if (payloadEnd > encodedDumdictValidationArtifacts.rootPayloadBlob.length) {
		throw new RangeError(
			`Corrupt generated Dumdict route offset: ${route}`,
		);
	}
	return encodedDumdictValidationArtifacts.rootPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function definitionPayloadAt(index: number, reference: string): string {
	const width = encodedDumdictValidationArtifacts.offsetWidth;
	const indexOffset = index * width;
	if (
		indexOffset + width >
		encodedDumdictValidationArtifacts.definitionIndexPayload.length
	) {
		throw new ReferenceError(
			`Unknown generated Dumdict validation reference: ${reference}`,
		);
	}
	const payloadIndex = readFixedWidthBase36(
		encodedDumdictValidationArtifacts.definitionIndexPayload,
		indexOffset,
	);
	const offsetStart = payloadIndex * width;
	if (
		offsetStart + width * 2 >
		encodedDumdictValidationArtifacts.definitionOffsetPayload.length
	) {
		throw new ReferenceError(
			`Unknown generated Dumdict validation reference: ${reference}`,
		);
	}
	const payloadStart = readFixedWidthBase36(
		encodedDumdictValidationArtifacts.definitionOffsetPayload,
		offsetStart,
	);
	const payloadEnd = readFixedWidthBase36(
		encodedDumdictValidationArtifacts.definitionOffsetPayload,
		offsetStart + width,
	);
	if (
		payloadEnd <= payloadStart ||
		payloadEnd >
			encodedDumdictValidationArtifacts.definitionPayloadBlob.length
	) {
		throw new RangeError(
			`Corrupt generated Dumdict definition offset: ${reference}`,
		);
	}
	return encodedDumdictValidationArtifacts.definitionPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function readFixedWidthBase36(payload: string, offset: number): number {
	const encoded = payload.slice(
		offset,
		offset + encodedDumdictValidationArtifacts.offsetWidth,
	);
	if (!/^[0-9a-z]{4}$/.test(encoded)) {
		throw new TypeError(
			`Corrupt generated Dumdict payload offset: ${encoded}`,
		);
	}
	return Number.parseInt(encoded, 36);
}

function definitionIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/.exec(reference);
	if (match === null) {
		throw new ReferenceError(
			`Invalid generated Dumdict validation reference: ${reference}`,
		);
	}
	return Number(match[1]);
}

function decodeConstraintPayload(payload: string, label: string): Constraint {
	try {
		return freezeDecodedConstraint(
			decodeCompactConstraintPayload(
				payload,
				encodedDumdictValidationArtifacts.requiredOperations,
				{
					externalString: (token, context) =>
						resolveCompactExternalString(
							token,
							context,
							encodedDumdictValidationArtifacts.externalStringSignatures,
							resolveDumdictExternalConstraintString,
						),
					maximumReferenceIndex:
						encodedDumdictValidationArtifacts.definitionIndexPayload
							.length /
							encodedDumdictValidationArtifacts.offsetWidth -
						1,
					stringTable: encodedDumdictValidationArtifacts.stringTable,
				},
			),
		);
	} catch (caught) {
		throw new TypeError(
			`Corrupt generated Dumdict validation constraint: ${label}`,
			{ cause: caught },
		);
	}
}

function freezeDecodedConstraint(constraint: Constraint): Constraint {
	const freeze = (value: unknown): void => {
		if (
			value === null ||
			typeof value !== "object" ||
			Object.isFrozen(value)
		)
			return;
		for (const child of Array.isArray(value)
			? value
			: Object.values(value as Record<string, unknown>))
			freeze(child);
		Object.freeze(value);
	};
	freeze(constraint);
	return constraint;
}

function idParseFailure(
	language: SupportedLanguage,
	parsed: ParsingError<unknown>,
): ApiResult<never, ParseError> {
	return {
		success: false,
		error: {
			code: "InvalidInput",
			language,
			message: "Input did not match the requested Dumling schema",
			issues: parsed.issues.map((issue) => {
				const path =
					issue.path.length > 0 ? issue.path.join(".") : "input";
				return `${path}: ${issue.message}`;
			}),
		},
	};
}

function compatibilityParseResult<Output>(
	language: SupportedLanguage,
	parsed: Parsed<Output>,
): ApiResult<Output, ParseError> {
	return parsed instanceof ParsingError
		? idParseFailure(language, parsed)
		: { success: true, data: parsed };
}

function buildDumdictCompatibilityParseOperations<
	Language extends SupportedLanguage,
>(language: Language): LanguageApi<Language>["parse"] {
	return {
		attestation: (input) =>
			compatibilityParseResult(
				language,
				parseCompatibilityAttestation(input, language),
			),
		lemma: (input) =>
			compatibilityParseResult(
				language,
				parseCompatibilityLemma(input, language),
			),
		surface: (input) =>
			compatibilityParseResult(
				language,
				parseCompatibilitySurface(input, language),
			),
	};
}

const compatibilityParsers = {
	de: buildDumdictCompatibilityParseOperations("de"),
	en: buildDumdictCompatibilityParseOperations("en"),
	he: buildDumdictCompatibilityParseOperations("he"),
};

export function getDumdictCompatibilityParseOperations<
	Language extends SupportedLanguage,
>(language: Language): LanguageApi<Language>["parse"] {
	return compatibilityParsers[language] as LanguageApi<Language>["parse"];
}

configureDumdictIdParsers({
	de: compatibilityParsers.de,
	en: compatibilityParsers.en,
	he: compatibilityParsers.he,
});
