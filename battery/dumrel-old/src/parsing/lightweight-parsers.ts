import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import {
	encodedDumrelValidationArtifacts,
	type GeneratedDumrelValidationRouteKey,
} from "../generated/validation-artifacts.js";
import type { ReadingReference } from "../types.js";
import { dumrelValidationOperations } from "./validation-operations.js";
import type {
	DumrelValidationRouteKey,
	DumrelValidationRouteOutput,
} from "./validation-routes.js";

/**
 * Lightweight parsers return canonical output, including normalization and
 * transforms, or this shared error for caller-controlled invalid input.
 */
export { ParsingError };

type Parsed<Output> = Output | ParsingError<Output>;

export function unwrapDumrelParse<Output>(
	parsed: Output | ParsingError<Output>,
): Output {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}

function parseDumrelRoute<Key extends GeneratedDumrelValidationRouteKey>(
	input: unknown,
	key: Key,
): Parsed<DumrelValidationRouteOutput<Key>> {
	return parseValidationArtifact(
		decodeDumrelValidationArtifact(key),
		input,
		dumrelValidationOperations,
	);
}

export function parseAsKnowledgeSettings(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsKnowledgeSettings">> {
	return parseDumrelRoute(input, "parseAsKnowledgeSettings");
}

export function parseAsGrammaticalRelationClaim(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsGrammaticalRelationClaim">> {
	return parseDumrelRoute(input, "parseAsGrammaticalRelationClaim");
}

export function parseAsGrammaticalSeries(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsGrammaticalSeries">> {
	return parseDumrelRoute(input, "parseAsGrammaticalSeries");
}

export function parseAsKnowledgeRequestMask(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsKnowledgeRequestMask">> {
	return parseDumrelRoute(input, "parseAsKnowledgeRequestMask");
}

export function parseAsMorphemeReadingReference(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsMorphemeReadingReference">> {
	return parseDumrelRoute(input, "parseAsMorphemeReadingReference");
}

export function parseAsUnitShadow(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsUnitShadow">> {
	return parseDumrelRoute(input, "parseAsUnitShadow");
}

export function parseAsLexicalUnitShadow(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsLexicalUnitShadow">> {
	return parseDumrelRoute(input, "parseAsLexicalUnitShadow");
}

export function parseAsLexemeUnitShadow(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsLexemeUnitShadow">> {
	return parseDumrelRoute(input, "parseAsLexemeUnitShadow");
}

export function parseAsMorphologicalTreeStructure(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsMorphologicalTreeStructure">> {
	return parseDumrelRoute(input, "parseAsMorphologicalTreeStructure");
}

export function parseAsMorphologicalTreeNode(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsMorphologicalTreeNode">> {
	return parseDumrelRoute(input, "parseAsMorphologicalTreeNode");
}

export function parseAsMorphologicalTree(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsMorphologicalTree">> {
	return parseDumrelRoute(input, "parseAsMorphologicalTree");
}

export function parseAsLexicalBreakdown(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsLexicalBreakdown">> {
	return parseDumrelRoute(input, "parseAsLexicalBreakdown");
}

export function parseAsSemanticRelations(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsSemanticRelations">> {
	return parseDumrelRoute(input, "parseAsSemanticRelations");
}

export function parseAsDirectSemanticRelationGraphEdge(
	input: unknown,
): Parsed<
	DumrelValidationRouteOutput<"parseAsDirectSemanticRelationGraphEdge">
> {
	return parseDumrelRoute(input, "parseAsDirectSemanticRelationGraphEdge");
}

export function parseAsSemanticRelationGraphReading(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsSemanticRelationGraphReading">> {
	return parseDumrelRoute(input, "parseAsSemanticRelationGraphReading");
}

export function parseAsSemanticRelationGraph(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsSemanticRelationGraph">> {
	return parseDumrelRoute(input, "parseAsSemanticRelationGraph");
}

export function parseAsPendingSemanticRelation(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsPendingSemanticRelation">> {
	return parseDumrelRoute(input, "parseAsPendingSemanticRelation");
}

export function parseAsReadingKnowledge(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsReadingKnowledge">> {
	return parseDumrelRoute(input, "parseAsReadingKnowledge");
}

export function parseAsKnowledgeChange(
	input: unknown,
): Parsed<DumrelValidationRouteOutput<"parseAsKnowledgeChange">> {
	return parseDumrelRoute(input, "parseAsKnowledgeChange");
}

export function parseReadingReferenceForApplicability(
	input: unknown,
): Parsed<ReadingReference> {
	return parseValidationArtifact(
		decodeGeneratedDumrelValidationArtifact("internal:reading-reference"),
		withLegacyPronounReferenceNulls(input),
		dumrelValidationOperations,
	);
}

function withLegacyPronounReferenceNulls(input: unknown): unknown {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return input;
	}
	const reading = input as Readonly<Record<string, unknown>>;
	const lemma = reading.lemma;
	if (lemma === null || typeof lemma !== "object" || Array.isArray(lemma)) {
		return input;
	}
	const lemmaRecord = lemma as Readonly<Record<string, unknown>>;
	const core = lemmaRecord.coreFeatures;
	if (
		lemmaRecord.language !== "de" ||
		lemmaRecord.family !== "Lexeme" ||
		lemmaRecord.kind !== "PRON" ||
		core === null ||
		typeof core !== "object" ||
		Array.isArray(core)
	) {
		return input;
	}
	const coreRecord = core as Readonly<Record<string, unknown>>;
	if (
		Object.hasOwn(coreRecord, "referenceGender") &&
		Object.hasOwn(coreRecord, "referenceNumber")
	) {
		return input;
	}
	return {
		...reading,
		lemma: {
			...lemmaRecord,
			coreFeatures: {
				...coreRecord,
				referenceGender: coreRecord.referenceGender ?? null,
				referenceNumber: coreRecord.referenceNumber ?? null,
			},
		},
	};
}

export function decodeDumrelValidationArtifact<
	Key extends DumrelValidationRouteKey,
>(key: Key): ValidationArtifact<DumrelValidationRouteOutput<Key>> {
	return decodeGeneratedDumrelValidationArtifact(key);
}

function decodeGeneratedDumrelValidationArtifact<
	Key extends DumrelValidationRouteKey,
>(key: Key): ValidationArtifact<DumrelValidationRouteOutput<Key>>;
function decodeGeneratedDumrelValidationArtifact(
	key: "internal:reading-reference",
): ValidationArtifact<ReadingReference>;
function decodeGeneratedDumrelValidationArtifact(
	key: DumrelValidationRouteKey | "internal:reading-reference",
): Readonly<{
	definitions: Readonly<Record<string, Constraint>>;
	root: Constraint;
	version: 1;
}> {
	const rootPayload = rootPayloadFor(key);
	if (rootPayload === undefined) {
		throw new ReferenceError(
			`Unknown generated Dumrel parser root: ${key}`,
		);
	}
	const definitionCache: Record<string, Constraint> = Object.create(null);
	const definitions = new Proxy(definitionCache, {
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			const payload = definitionPayloadAt(
				definitionIndex(property),
				property,
			);
			const constraint = decodeConstraintPayload(payload, property);
			target[property] = constraint;
			return constraint;
		},
	});
	return {
		definitions,
		root: decodeConstraintPayload(rootPayload, key),
		version: encodedDumrelValidationArtifacts.version,
	};
}

function rootPayloadFor(route: string): string | undefined {
	const marker = `\n${route}\0`;
	const markerStart =
		encodedDumrelValidationArtifacts.routeIndexPayload.indexOf(marker);
	if (markerStart < 0) return undefined;
	const offsetStart = markerStart + marker.length;
	const payloadStart = readFixedWidthHex(
		encodedDumrelValidationArtifacts.routeIndexPayload,
		offsetStart,
	);
	const payloadLength = readFixedWidthHex(
		encodedDumrelValidationArtifacts.routeIndexPayload,
		offsetStart + encodedDumrelValidationArtifacts.offsetWidth,
	);
	const payloadEnd = payloadStart + payloadLength;
	if (payloadEnd > encodedDumrelValidationArtifacts.rootPayloadBlob.length) {
		throw new RangeError(`Corrupt generated Dumrel route offset: ${route}`);
	}
	return encodedDumrelValidationArtifacts.rootPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function definitionPayloadAt(index: number, reference: string): string {
	const width = encodedDumrelValidationArtifacts.offsetWidth;
	const offsetStart = index * width;
	if (
		offsetStart + width * 2 >
		encodedDumrelValidationArtifacts.definitionOffsetPayload.length
	) {
		throw new ReferenceError(
			`Unknown generated Dumrel validation reference: ${reference}`,
		);
	}
	const payloadStart = readFixedWidthHex(
		encodedDumrelValidationArtifacts.definitionOffsetPayload,
		offsetStart,
	);
	const payloadEnd = readFixedWidthHex(
		encodedDumrelValidationArtifacts.definitionOffsetPayload,
		offsetStart + width,
	);
	if (
		payloadEnd <= payloadStart ||
		payloadEnd >
			encodedDumrelValidationArtifacts.definitionPayloadBlob.length
	) {
		throw new RangeError(
			`Corrupt generated Dumrel definition offset: ${reference}`,
		);
	}
	return encodedDumrelValidationArtifacts.definitionPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function readFixedWidthHex(payload: string, offset: number): number {
	const encoded = payload.slice(
		offset,
		offset + encodedDumrelValidationArtifacts.offsetWidth,
	);
	if (!/^[0-9a-f]{6}$/.test(encoded)) {
		throw new TypeError(
			`Corrupt generated Dumrel payload offset: ${encoded}`,
		);
	}
	return Number.parseInt(encoded, 16);
}

function definitionIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/.exec(reference);
	if (match === null) {
		throw new ReferenceError(
			`Invalid generated Dumrel validation reference: ${reference}`,
		);
	}
	return Number(match[1]);
}

function decodeConstraintPayload(payload: string, label: string): Constraint {
	const decoded: unknown = JSON.parse(payload);
	if (!Array.isArray(decoded) || typeof decoded[0] !== "string") {
		throw new TypeError(
			`Corrupt generated Dumrel validation constraint: ${label}`,
		);
	}
	return decoded as unknown as Constraint;
}
