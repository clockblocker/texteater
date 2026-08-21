import type {
	ArrayConstraintCheck,
	ArtifactPrimitive,
	Constraint,
	NumberConstraintCheck,
	ObjectUnknownKeyPolicy,
	StringConstraintCheck,
	ValidationEffect,
} from "common-utils";

type DecodeOptions = Readonly<{
	externalString?: (token: string, context: string) => string;
	maximumReferenceIndex: number;
	stringTable?: readonly string[];
}>;

export const COMPACT_EMOJI_PATTERN_TOKEN =
	"dumling.compact-emoji-sequence-pattern.v1";

type IndexedPayload = Readonly<{
	index: number;
	indexPayload: string;
	offsetPayload: string;
	payloadBlob: string;
	offsetWidth: number;
	label: string;
}>;

/**
 * Resolve one logical definition index through the generated canonical-payload
 * index and its adjacent boundary pair. The boundary representation cannot
 * express overlaps: a descending/equal pair is corrupt and fails closed.
 */
export function readCompactIndexedPayload({
	index,
	indexPayload,
	offsetPayload,
	payloadBlob,
	offsetWidth,
	label,
}: IndexedPayload): string {
	if (!Number.isSafeInteger(offsetWidth) || offsetWidth <= 0)
		throw new TypeError(
			"Compact payload offset width must be a positive integer.",
		);
	if (!Number.isSafeInteger(index) || index < 0)
		throw new ReferenceError(`Unknown compact payload index: ${label}.`);
	const indexOffset = index * offsetWidth;
	if (indexOffset + offsetWidth > indexPayload.length)
		throw new ReferenceError(`Unknown compact payload index: ${label}.`);
	const payloadIndex = readFixedWidthBase36(
		indexPayload,
		indexOffset,
		offsetWidth,
	);
	const offsetStart = payloadIndex * offsetWidth;
	if (offsetStart + offsetWidth * 2 > offsetPayload.length)
		throw new ReferenceError(`Unknown compact payload index: ${label}.`);
	const payloadStart = readFixedWidthBase36(
		offsetPayload,
		offsetStart,
		offsetWidth,
	);
	const payloadEnd = readFixedWidthBase36(
		offsetPayload,
		offsetStart + offsetWidth,
		offsetWidth,
	);
	if (payloadEnd <= payloadStart || payloadEnd > payloadBlob.length)
		throw new RangeError(`Corrupt compact payload boundary: ${label}.`);
	return payloadBlob.slice(payloadStart, payloadEnd);
}

function readFixedWidthBase36(
	payload: string,
	offset: number,
	width: number,
): number {
	const encoded = payload.slice(offset, offset + width);
	let valid = encoded.length === width;
	for (let index = 0; valid && index < width; index += 1) {
		const code = encoded.charCodeAt(index);
		valid = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
	}
	if (!valid)
		throw new TypeError(`Corrupt compact payload offset: ${encoded}.`);
	return Number.parseInt(encoded, 36);
}

export function encodeCompactConstraintPayload(
	constraint: Constraint,
	operations: readonly string[],
	stringTable: readonly string[] = [],
): string {
	const operationIndexes = new Map(
		operations.map((operation, index) => [operation, index]),
	);
	const stringIndexes = new Map(
		stringTable.map((value, index) => [value, index]),
	);
	return JSON.stringify(
		encodeConstraint(constraint, operationIndexes, stringIndexes),
	);
}

export function collectCompactConstraintStringTable(
	constraints: readonly Constraint[],
	excludedStrings: readonly string[] = [],
): readonly string[] {
	const counts = new Map<string, number>();
	const count = (value: string): void => {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	};
	const visit = (constraint: Constraint): void => {
		switch (constraint[0]) {
			case "array":
			case "nullable":
			case "optional":
				visit(constraint[1]);
				return;
			case "enum":
				for (const value of constraint[1])
					if (typeof value === "string") count(value);
				return;
			case "literal":
				if (typeof constraint[1] === "string") count(constraint[1]);
				return;
			case "object":
				for (const [key, child] of Object.entries(constraint[1])) {
					count(key);
					visit(child);
				}
				return;
			case "pipe":
				visit(constraint[1]);
				for (const effect of constraint[2]) {
					if (effect[0] === "regex") {
						count(effect[1]);
						count(effect[2]);
					}
				}
				return;
			case "preprocess":
				visit(constraint[2]);
				return;
			case "partial-record":
			case "record":
				visit(constraint[1]);
				visit(constraint[2]);
				return;
			case "union":
				for (const child of constraint[1]) visit(child);
				return;
			case "boolean":
			case "null":
			case "number":
			case "ref":
			case "string":
			case "unknown":
				return;
		}
	};
	for (const constraint of constraints) visit(constraint);
	const excluded = new Set(excludedStrings);
	return [...counts]
		.filter(([value, occurrences]) => {
			const literalBytes = JSON.stringify(value).length;
			return (
				!excluded.has(value) &&
				occurrences > 1 &&
				(literalBytes - 6) * occurrences > literalBytes + 1
			);
		})
		.map(([value]) => value)
		.toSorted();
}

export function replaceCompactStringWithExternalToken(
	payload: string,
	value: string,
	token: string,
): string {
	const encodedValue = JSON.stringify(value);
	if (!payload.includes(encodedValue)) return payload;
	return payload.replaceAll(encodedValue, JSON.stringify(["x", token]));
}

export function compactExternalStringSignature(
	value: string,
	context: string,
): string {
	let hash = 2_166_136_261;
	const input = `${value}\0${context}`;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return `v1:${input.length.toString(36)}:${(hash >>> 0).toString(36)}`;
}

export function resolveCompactExternalString(
	token: string,
	context: string,
	signatures: Readonly<Record<string, string>>,
	resolver: (token: string) => string,
): string {
	const expected = signatures[token];
	if (expected === undefined)
		throw new ReferenceError(
			`Unknown compact external-string token: ${token}.`,
		);
	const value = resolver(token);
	if (compactExternalStringSignature(value, context) !== expected)
		throw new TypeError(
			`Compact external-string signature mismatch: ${token}.`,
		);
	return value;
}

export function decodeCompactConstraintPayload(
	payload: string,
	operations: readonly string[],
	options: DecodeOptions,
): Constraint {
	return decodeConstraint(JSON.parse(payload), operations, options);
}

function encodeConstraint(
	constraint: Constraint,
	operationIndexes: ReadonlyMap<string, number>,
	stringIndexes: ReadonlyMap<string, number>,
): unknown {
	switch (constraint[0]) {
		case "array":
			return [
				"a",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
				constraint[2].map(encodeArrayCheck),
			];
		case "boolean":
			return ["b"];
		case "enum":
			return [
				"e",
				constraint[1].map((value) =>
					encodePrimitive(value, stringIndexes),
				),
			];
		case "literal":
			return ["l", encodePrimitive(constraint[1], stringIndexes)];
		case "null":
			return ["z"];
		case "nullable":
			return [
				"n",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
			];
		case "number":
			return constraint[1] === undefined
				? ["d"]
				: ["d", constraint[1].map(encodeNumberCheck)];
		case "object":
			return [
				"o",
				Object.entries(constraint[1]).flatMap(([key, child]) => [
					encodeStringReference(key, stringIndexes),
					encodeConstraint(child, operationIndexes, stringIndexes),
				]),
				encodeUnknownKeyPolicy(constraint[2]),
			];
		case "optional":
			return [
				"?",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
			];
		case "pipe":
			return [
				"p",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
				constraint[2].map((effect) =>
					encodeEffect(effect, operationIndexes, stringIndexes),
				),
			];
		case "preprocess":
			return [
				"q",
				operationIndex(constraint[1], operationIndexes),
				encodeConstraint(
					constraint[2],
					operationIndexes,
					stringIndexes,
				),
			];
		case "partial-record":
			return [
				"h",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
				encodeConstraint(
					constraint[2],
					operationIndexes,
					stringIndexes,
				),
			];
		case "record":
			return [
				"c",
				encodeConstraint(
					constraint[1],
					operationIndexes,
					stringIndexes,
				),
				encodeConstraint(
					constraint[2],
					operationIndexes,
					stringIndexes,
				),
			];
		case "ref":
			return ["r", referenceIndex(constraint[1])];
		case "string":
			return constraint[1] === undefined
				? ["s"]
				: ["s", constraint[1].map(encodeStringCheck)];
		case "union":
			return [
				"u",
				constraint[1].map((child) =>
					encodeConstraint(child, operationIndexes, stringIndexes),
				),
			];
		case "unknown":
			return ["w"];
	}
}

function decodeConstraint(
	encoded: unknown,
	operations: readonly string[],
	options: DecodeOptions,
): Constraint {
	const tuple = encodedTuple(encoded, "constraint");
	switch (tuple[0]) {
		case "a":
			expectLength(tuple, 3, "array constraint");
			return [
				"array",
				decodeConstraint(tuple[1], operations, options),
				encodedArray(tuple[2], "array checks").map(decodeArrayCheck),
			];
		case "b":
			expectLength(tuple, 1, "boolean constraint");
			return ["boolean"];
		case "e":
			expectLength(tuple, 2, "enum constraint");
			return [
				"enum",
				encodedArray(tuple[1], "enum values").map((value) =>
					decodePrimitive(value, options.stringTable ?? []),
				),
			];
		case "l":
			expectLength(tuple, 2, "literal constraint");
			return [
				"literal",
				decodePrimitive(tuple[1], options.stringTable ?? []),
			];
		case "z":
			expectLength(tuple, 1, "null constraint");
			return ["null"];
		case "n":
			expectLength(tuple, 2, "nullable constraint");
			return [
				"nullable",
				decodeConstraint(tuple[1], operations, options),
			];
		case "d":
			if (tuple.length === 1) return ["number"];
			expectLength(tuple, 2, "number constraint");
			return [
				"number",
				encodedArray(tuple[1], "number checks").map(decodeNumberCheck),
			];
		case "o": {
			expectLength(tuple, 3, "object constraint");
			const shapeEntries = encodedArray(tuple[1], "object shape");
			if (shapeEntries.length % 2 !== 0)
				throw new TypeError(
					"Compact object shape must contain key/value pairs.",
				);
			const shape: Record<string, Constraint> = {};
			for (let index = 0; index < shapeEntries.length; index += 2) {
				const key = decodeStringReference(
					shapeEntries[index],
					options.stringTable ?? [],
					"object key",
				);
				if (Object.hasOwn(shape, key))
					throw new TypeError(
						`Duplicate compact object key: ${key}.`,
					);
				shape[key] = decodeConstraint(
					shapeEntries[index + 1],
					operations,
					options,
				);
			}
			return ["object", shape, decodeUnknownKeyPolicy(tuple[2])];
		}
		case "?":
			expectLength(tuple, 2, "optional constraint");
			return [
				"optional",
				decodeConstraint(tuple[1], operations, options),
			];
		case "p":
			expectLength(tuple, 3, "pipe constraint");
			return [
				"pipe",
				decodeConstraint(tuple[1], operations, options),
				encodedArray(tuple[2], "validation effects").map((effect) =>
					decodeEffect(effect, operations, options),
				),
			];
		case "q":
			expectLength(tuple, 3, "preprocess constraint");
			return [
				"preprocess",
				decodeOperation(tuple[1], operations),
				decodeConstraint(tuple[2], operations, options),
			];
		case "h":
			expectLength(tuple, 3, "partial record constraint");
			return [
				"partial-record",
				decodeConstraint(tuple[1], operations, options),
				decodeConstraint(tuple[2], operations, options),
			];
		case "c":
			expectLength(tuple, 3, "record constraint");
			return [
				"record",
				decodeConstraint(tuple[1], operations, options),
				decodeConstraint(tuple[2], operations, options),
			];
		case "r": {
			expectLength(tuple, 2, "reference constraint");
			const index = encodedInteger(tuple[1], "reference index");
			if (index < 0 || index > options.maximumReferenceIndex) {
				throw new ReferenceError(
					`Compact validation reference is out of range: ${index}.`,
				);
			}
			return ["ref", `n${String(index)}`];
		}
		case "s":
			if (tuple.length === 1) return ["string"];
			expectLength(tuple, 2, "string constraint");
			return [
				"string",
				encodedArray(tuple[1], "string checks").map(decodeStringCheck),
			];
		case "u":
			expectLength(tuple, 2, "union constraint");
			return [
				"union",
				encodedArray(tuple[1], "union options").map((child) =>
					decodeConstraint(child, operations, options),
				),
			];
		case "w":
			expectLength(tuple, 1, "unknown constraint");
			return ["unknown"];
		default:
			throw new TypeError(
				`Unknown compact validation opcode: ${String(tuple[0])}.`,
			);
	}
}

function encodeEffect(
	effect: ValidationEffect,
	operationIndexes: ReadonlyMap<string, number>,
	stringIndexes: ReadonlyMap<string, number>,
): unknown {
	switch (effect[0]) {
		case "array":
			return ["a", encodeArrayCheck(effect[1])];
		case "operation":
			return ["x", operationIndex(effect[1], operationIndexes)];
		case "regex":
			return [
				"g",
				encodeStringReference(effect[1], stringIndexes),
				encodeStringReference(effect[2], stringIndexes),
			];
		case "string":
			return ["s", encodeStringCheck(effect[1])];
	}
}

function decodeEffect(
	encoded: unknown,
	operations: readonly string[],
	options: DecodeOptions,
): ValidationEffect {
	const stringTable = options.stringTable ?? [];
	const tuple = encodedTuple(encoded, "validation effect");
	switch (tuple[0]) {
		case "a":
			expectLength(tuple, 2, "array effect");
			return ["array", decodeArrayCheck(tuple[1])];
		case "x":
			expectLength(tuple, 2, "operation effect");
			return ["operation", decodeOperation(tuple[1], operations)];
		case "g": {
			expectLength(tuple, 3, "regex effect");
			const flags = decodeStringReference(
				tuple[2],
				stringTable,
				"regex flags",
			);
			return [
				"regex",
				decodeStringReference(
					tuple[1],
					stringTable,
					"regex source",
					flags,
					options.externalString,
				),
				flags,
			];
		}
		case "s":
			expectLength(tuple, 2, "string effect");
			return ["string", decodeStringCheck(tuple[1])];
		default:
			throw new TypeError(
				`Unknown compact validation effect opcode: ${String(tuple[0])}.`,
			);
	}
}

function encodeStringCheck(check: StringConstraintCheck): unknown {
	return [
		check[0] === "length" ? "l" : check[0] === "max" ? "x" : "m",
		check[1],
	];
}

function decodeStringCheck(encoded: unknown): StringConstraintCheck {
	const tuple = encodedTuple(encoded, "string check");
	expectLength(tuple, 2, "string check");
	const value = encodedNumber(tuple[1], "string check bound");
	if (tuple[0] === "l") return ["length", value];
	if (tuple[0] === "x") return ["max", value];
	if (tuple[0] === "m") return ["min", value];
	throw new TypeError(
		`Unknown compact string-check opcode: ${String(tuple[0])}.`,
	);
}

function encodeArrayCheck(check: ArrayConstraintCheck): unknown {
	return [
		check[0] === "length" ? "l" : check[0] === "max" ? "x" : "m",
		check[1],
	];
}

function decodeArrayCheck(encoded: unknown): ArrayConstraintCheck {
	const tuple = encodedTuple(encoded, "array check");
	expectLength(tuple, 2, "array check");
	const value = encodedNumber(tuple[1], "array check bound");
	if (tuple[0] === "l") return ["length", value];
	if (tuple[0] === "x") return ["max", value];
	if (tuple[0] === "m") return ["min", value];
	throw new TypeError(
		`Unknown compact array-check opcode: ${String(tuple[0])}.`,
	);
}

function encodeNumberCheck(check: NumberConstraintCheck): unknown {
	switch (check[0]) {
		case "int":
			return ["i"];
		case "max":
			return ["x", check[1], check[2]];
		case "min":
			return ["m", check[1], check[2]];
		case "multiple":
			return ["u", check[1]];
	}
}

function decodeNumberCheck(encoded: unknown): NumberConstraintCheck {
	const tuple = encodedTuple(encoded, "number check");
	if (tuple[0] === "i") {
		expectLength(tuple, 1, "integer check");
		return ["int"];
	}
	if (tuple[0] === "u") {
		expectLength(tuple, 2, "multiple check");
		return ["multiple", encodedNumber(tuple[1], "number multiple")];
	}
	if (tuple[0] === "x" || tuple[0] === "m") {
		expectLength(tuple, 3, "number bound check");
		const bound = encodedNumber(tuple[1], "number bound");
		const inclusive = encodedBoolean(tuple[2], "number bound inclusive");
		return tuple[0] === "x"
			? ["max", bound, inclusive]
			: ["min", bound, inclusive];
	}
	throw new TypeError(
		`Unknown compact number-check opcode: ${String(tuple[0])}.`,
	);
}

function encodeUnknownKeyPolicy(policy: ObjectUnknownKeyPolicy): string {
	return policy === "passthrough" ? "p" : policy === "strict" ? "s" : "r";
}

function decodeUnknownKeyPolicy(encoded: unknown): ObjectUnknownKeyPolicy {
	if (encoded === "p") return "passthrough";
	if (encoded === "s") return "strict";
	if (encoded === "r") return "strip";
	throw new TypeError(`Unknown compact object policy: ${String(encoded)}.`);
}

function operationIndex(
	operation: string,
	operationIndexes: ReadonlyMap<string, number>,
): number {
	const index = operationIndexes.get(operation);
	if (index === undefined)
		throw new ReferenceError(
			`Unknown compact validation operation: ${operation}.`,
		);
	return index;
}

function decodeOperation(
	encoded: unknown,
	operations: readonly string[],
): string {
	const index = encodedInteger(encoded, "operation index");
	const operation = operations[index];
	if (operation === undefined)
		throw new ReferenceError(
			`Compact validation operation is out of range: ${index}.`,
		);
	return operation;
}

function encodeStringReference(
	value: string,
	stringIndexes: ReadonlyMap<string, number>,
): string | number {
	return stringIndexes.get(value) ?? value;
}

function decodeStringReference(
	encoded: unknown,
	stringTable: readonly string[],
	label: string,
	context = "",
	externalString?: (token: string, context: string) => string,
): string {
	if (typeof encoded === "string") return encoded;
	if (Array.isArray(encoded)) {
		const tuple = encodedTuple(
			encoded,
			`${label} external-string reference`,
		);
		expectLength(tuple, 2, `${label} external-string reference`);
		if (tuple[0] !== "x" || typeof tuple[1] !== "string")
			throw new TypeError(
				`Invalid compact ${label} external-string token.`,
			);
		if (externalString === undefined)
			throw new ReferenceError(
				`No resolver for compact external-string token: ${tuple[1]}.`,
			);
		return externalString(tuple[1], context);
	}
	const index = encodedInteger(encoded, `${label} string-table index`);
	const value = stringTable[index];
	if (value === undefined)
		throw new ReferenceError(
			`Compact ${label} string-table index is out of range: ${index}.`,
		);
	return value;
}

function encodePrimitive(
	value: ArtifactPrimitive,
	stringIndexes: ReadonlyMap<string, number>,
): unknown {
	return typeof value === "string"
		? ["t", encodeStringReference(value, stringIndexes)]
		: value;
}

function referenceIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/.exec(reference);
	if (match === null)
		throw new ReferenceError(
			`Unsupported validation reference: ${reference}.`,
		);
	return Number(match[1]);
}

function encodedTuple(encoded: unknown, label: string): unknown[] {
	if (!Array.isArray(encoded) || typeof encoded[0] !== "string")
		throw new TypeError(`Compact ${label} must be an opcode tuple.`);
	return encoded;
}

function encodedArray(encoded: unknown, label: string): unknown[] {
	if (!Array.isArray(encoded))
		throw new TypeError(`Compact ${label} must be an array.`);
	return encoded;
}

function encodedNumber(encoded: unknown, label: string): number {
	if (typeof encoded !== "number" || !Number.isFinite(encoded))
		throw new TypeError(`Compact ${label} must be a finite number.`);
	return encoded;
}

function encodedInteger(encoded: unknown, label: string): number {
	const value = encodedNumber(encoded, label);
	if (!Number.isSafeInteger(value))
		throw new TypeError(`Compact ${label} must be an integer.`);
	return value;
}

function encodedBoolean(encoded: unknown, label: string): boolean {
	if (typeof encoded !== "boolean")
		throw new TypeError(`Compact ${label} must be boolean.`);
	return encoded;
}

function decodePrimitive(
	encoded: unknown,
	stringTable: readonly string[],
): ArtifactPrimitive {
	if (Array.isArray(encoded)) {
		const tuple = encodedTuple(encoded, "string primitive");
		if (tuple[0] !== "t")
			throw new TypeError(
				`Unknown compact primitive opcode: ${String(tuple[0])}.`,
			);
		expectLength(tuple, 2, "string primitive");
		return decodeStringReference(tuple[1], stringTable, "primitive");
	}
	if (
		encoded === null ||
		typeof encoded === "boolean" ||
		(typeof encoded === "number" && Number.isFinite(encoded))
	)
		return encoded;
	throw new TypeError("Compact artifact primitive is invalid.");
}

function expectLength(
	tuple: readonly unknown[],
	length: number,
	label: string,
): void {
	if (tuple.length !== length)
		throw new TypeError(`Compact ${label} has the wrong tuple length.`);
}
