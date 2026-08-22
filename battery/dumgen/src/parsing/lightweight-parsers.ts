import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import {
	encodedDumgenValidationArtifacts,
	type GeneratedDumgenOperationalValidationRouteKey,
	loadEncodedDumgenValidationPayloads,
} from "../generated/validation-artifacts.js";
import type {
	EnabledSegmentationLanguage,
	GrammaticalInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationResult,
	SegmentedSentence,
} from "../types.js";
import { dumgenValidationOperations } from "./validation-operations.js";
import type {
	DumgenOperationalValidationRouteKey,
	DumgenOperationalValidationRouteOutput,
} from "./validation-routes.js";

export { ParsingError };

type Parsed<Output> = Output | ParsingError<Output>;

export function unwrapDumgenParse<Output>(parsed: Parsed<Output>): Output {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}

function parseDumgenRoute<
	Key extends GeneratedDumgenOperationalValidationRouteKey,
>(
	input: unknown,
	key: Key,
): Parsed<DumgenOperationalValidationRouteOutput<Key>> {
	const recursiveIssue = recursiveInputIssue(input, key);
	if (recursiveIssue !== undefined) return new ParsingError([recursiveIssue]);
	return parseValidationArtifact(
		decodeDumgenValidationArtifact(key),
		input,
		dumgenValidationOperations,
	);
}

function recursiveInputIssue(
	input: unknown,
	key: GeneratedDumgenOperationalValidationRouteKey,
): ParsingIssue | undefined {
	if (key !== "parseAsKnowledgeGenerationResult") return undefined;
	if (input === null || typeof input !== "object") return undefined;
	const changes = Reflect.get(input, "changes");
	if (!Array.isArray(changes)) return undefined;
	for (const [index, change] of changes.entries()) {
		if (
			change === null ||
			typeof change !== "object" ||
			Reflect.get(change, "aspect") !== "morphologicalTree"
		)
			continue;
		const value = Reflect.get(change, "value");
		if (value === null || typeof value !== "object") continue;
		const issue = recursiveTreeIssue(Reflect.get(value, "root"), [
			"changes",
			index,
			"value",
			"root",
		]);
		if (issue !== undefined) return issue;
	}
	return undefined;
}

function recursiveTreeIssue(
	value: unknown,
	path: ParsingIssue["path"],
): ParsingIssue | undefined {
	type Frame = Readonly<{
		leaving: boolean;
		path: ParsingIssue["path"];
		value: unknown;
	}>;
	const activeAncestors = new Set<object>();
	const stack: Frame[] = [{ leaving: false, path, value }];
	while (stack.length > 0) {
		const frame = stack.pop();
		if (frame === undefined) break;
		if (frame.value === null || typeof frame.value !== "object") continue;
		if (frame.leaving) {
			activeAncestors.delete(frame.value);
			continue;
		}
		if (activeAncestors.has(frame.value))
			return {
				code: "custom",
				message: "Cyclic input is not supported",
				path: frame.path,
			};
		activeAncestors.add(frame.value);
		stack.push({ ...frame, leaving: true });
		if (Array.isArray(frame.value)) {
			for (let index = frame.value.length - 1; index >= 0; index -= 1)
				stack.push({
					leaving: false,
					path: [...frame.path, index],
					value: frame.value[index],
				});
			continue;
		}
		const children = Reflect.get(frame.value, "children");
		if (Array.isArray(children))
			stack.push({
				leaving: false,
				path: [...frame.path, "children"],
				value: children,
			});
	}
	return undefined;
}

export function parseAsKnowledgeGenerationRequest(input: unknown) {
	return parseDumgenRoute(input, "parseAsKnowledgeGenerationRequest");
}
export function parseAsKnowledgeGenerationInput<
	const L extends KnowledgeGenerationLanguage,
>(input: unknown, language: L): Parsed<KnowledgeGenerationInput<L>>;
export function parseAsKnowledgeGenerationInput(
	input: unknown,
	language: KnowledgeGenerationLanguage,
) {
	return parseDumgenRoute(
		input,
		`parseAsKnowledgeGenerationInput:${language}` as const,
	);
}
export function parseAsKnowledgeGenerationResult(
	input: unknown,
): Parsed<KnowledgeGenerationResult> {
	return parseDumgenRoute(input, "parseAsKnowledgeGenerationResult");
}
export function parseAsSegmentedSentenceId(input: unknown) {
	return parseDumgenRoute(input, "parseAsSegmentedSentenceId");
}
export function parseAsSegment(input: unknown) {
	return parseDumgenRoute(input, "parseAsSegment");
}
export function parseAsSegmentedSentence<
	const L extends EnabledSegmentationLanguage,
>(input: unknown, language: L): Parsed<SegmentedSentence<L>>;
export function parseAsSegmentedSentence(
	input: unknown,
	language: EnabledSegmentationLanguage,
) {
	return parseDumgenRoute(
		input,
		`parseAsSegmentedSentence:${language}` as const,
	);
}
export function parseAsSegmentationDecision(input: unknown) {
	return parseDumgenRoute(input, "parseAsSegmentationDecision");
}
export function parseAsSection1Error(input: unknown) {
	return parseDumgenRoute(input, "parseAsSection1Error");
}
export function parseAsSegmentationResult(input: unknown) {
	return parseDumgenRoute(input, "parseAsSegmentationResult");
}
export function parseAsGrammaticalRoute<
	const L extends GrammaticalResolutionLanguage,
>(input: unknown, language: L): Parsed<GrammaticalRoute<L>>;
export function parseAsGrammaticalRoute(
	input: unknown,
	language: GrammaticalResolutionLanguage,
) {
	return parseDumgenRoute(
		input,
		`parseAsGrammaticalRoute:${language}` as const,
	);
}
export function parseAsGrammaticalInteraction(input: unknown) {
	return parseDumgenRoute(input, "parseAsGrammaticalInteraction");
}
export function parseAsGrammaticalInput<
	const L extends GrammaticalResolutionLanguage,
>(input: unknown, language: L): Parsed<GrammaticalInput<L>>;
export function parseAsGrammaticalInput(
	input: unknown,
	language: GrammaticalResolutionLanguage,
) {
	return parseDumgenRoute(
		input,
		`parseAsGrammaticalInput:${language}` as const,
	);
}
export function parseAsGrammaticalResult<
	const L extends GrammaticalResolutionLanguage,
>(input: unknown, language: L): Parsed<GrammaticalResult<L>>;
export function parseAsGrammaticalResult(
	input: unknown,
	language: GrammaticalResolutionLanguage,
) {
	return parseDumgenRoute(
		input,
		`parseAsGrammaticalResult:${language}` as const,
	);
}

export function parseAsGermanAttestation(input: unknown) {
	return parseDumgenRoute(input, "internal:GermanAttestation:de");
}

export function decodeDumgenValidationArtifact<
	Key extends DumgenOperationalValidationRouteKey,
>(key: Key): ValidationArtifact<DumgenOperationalValidationRouteOutput<Key>> {
	const rootPayload = rootPayloadFor(key);
	if (rootPayload === undefined)
		throw new ReferenceError(
			`Unknown generated Dumgen parser root: ${key}`,
		);
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
		version: encodedDumgenValidationArtifacts.version,
	};
}

function rootPayloadFor(route: string): string | undefined {
	const payloads = loadEncodedDumgenValidationPayloads();
	const marker = `\n${route}\0`;
	const markerStart =
		encodedDumgenValidationArtifacts.routeIndexPayload.indexOf(marker);
	if (markerStart < 0) return undefined;
	const offsetStart = markerStart + marker.length;
	const payloadStart = readFixedWidthHex(
		encodedDumgenValidationArtifacts.routeIndexPayload,
		offsetStart,
	);
	const payloadLength = readFixedWidthHex(
		encodedDumgenValidationArtifacts.routeIndexPayload,
		offsetStart + encodedDumgenValidationArtifacts.offsetWidth,
	);
	const payloadEnd = payloadStart + payloadLength;
	if (payloadEnd > payloads.rootPayloadBlob.length)
		throw new RangeError(`Corrupt generated Dumgen route offset: ${route}`);
	return payloads.rootPayloadBlob.slice(payloadStart, payloadEnd);
}

function definitionPayloadAt(index: number, reference: string): string {
	const payloads = loadEncodedDumgenValidationPayloads();
	const width = encodedDumgenValidationArtifacts.offsetWidth;
	const offsetStart = index * width * 2;
	if (offsetStart + width * 2 > payloads.definitionOffsetPayload.length)
		throw new ReferenceError(
			`Unknown generated Dumgen validation reference: ${reference}`,
		);
	const payloadStart = readFixedWidthHex(
		payloads.definitionOffsetPayload,
		offsetStart,
	);
	const payloadEnd = readFixedWidthHex(
		payloads.definitionOffsetPayload,
		offsetStart + width,
	);
	if (
		payloadEnd <= payloadStart ||
		payloadEnd > payloads.definitionPayloadBlob.length
	)
		throw new RangeError(
			`Corrupt generated Dumgen definition offset: ${reference}`,
		);
	return payloads.definitionPayloadBlob.slice(payloadStart, payloadEnd);
}

function readFixedWidthHex(payload: string, offset: number): number {
	const encoded = payload.slice(
		offset,
		offset + encodedDumgenValidationArtifacts.offsetWidth,
	);
	if (!/^[0-9a-f]{6}$/u.test(encoded))
		throw new TypeError(
			`Corrupt generated Dumgen payload offset: ${encoded}`,
		);
	return Number.parseInt(encoded, 16);
}

function definitionIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/u.exec(reference);
	if (match === null)
		throw new ReferenceError(
			`Invalid generated Dumgen validation reference: ${reference}`,
		);
	return Number(match[1]);
}

function decodeConstraintPayload(payload: string, label: string): Constraint {
	const decoded: unknown = JSON.parse(payload);
	if (!Array.isArray(decoded) || typeof decoded[0] !== "string")
		throw new TypeError(
			`Corrupt generated Dumgen validation constraint: ${label}`,
		);
	return decoded as unknown as Constraint;
}
