export type ParsingPath = PropertyKey[];

export type InvalidTypeExpected =
	| "string"
	| "number"
	| "int"
	| "boolean"
	| "bigint"
	| "symbol"
	| "undefined"
	| "null"
	| "never"
	| "void"
	| "date"
	| "array"
	| "object"
	| "tuple"
	| "record"
	| "map"
	| "set"
	| "file"
	| "nonoptional"
	| "nan"
	| "function"
	| (string & {});

export interface ParsingIssueBase {
	readonly code: string;
	readonly path: ParsingPath;
	readonly message: string;
}

export interface InvalidTypeIssue extends ParsingIssueBase {
	readonly code: "invalid_type";
	readonly expected: InvalidTypeExpected;
	readonly format?: string;
	readonly received?: string;
}

export interface TooBigIssue extends ParsingIssueBase {
	readonly code: "too_big";
	readonly origin: string;
	readonly maximum: number | bigint;
	readonly inclusive?: boolean;
	readonly exact?: boolean;
	readonly note?: string;
}

export interface TooSmallIssue extends ParsingIssueBase {
	readonly code: "too_small";
	readonly origin: string;
	readonly minimum: number | bigint;
	readonly inclusive?: boolean;
	readonly exact?: boolean;
	readonly note?: string;
}

export interface InvalidFormatIssue extends ParsingIssueBase {
	readonly code: "invalid_format";
	readonly origin?: string;
	readonly format: string;
	readonly pattern?: string;
	readonly algorithm?: string;
	readonly prefix?: string;
	readonly suffix?: string;
	readonly includes?: string;
}

export interface NotMultipleOfIssue extends ParsingIssueBase {
	readonly code: "not_multiple_of";
	readonly divisor: number;
}

export interface UnrecognizedKeysIssue extends ParsingIssueBase {
	readonly code: "unrecognized_keys";
	readonly keys: string[];
}

export interface InvalidUnionNoMatchIssue extends ParsingIssueBase {
	readonly code: "invalid_union";
	readonly errors: ParsingIssue[][];
	readonly discriminator?: string;
	readonly note?: string;
	readonly options?: PrimitiveValue[];
	readonly inclusive?: true;
}

export interface InvalidUnionMultipleMatchIssue extends ParsingIssueBase {
	readonly code: "invalid_union";
	readonly errors: [];
	readonly discriminator?: string;
	readonly options?: PrimitiveValue[];
	readonly inclusive: false;
}

export type InvalidUnionIssue =
	| InvalidUnionMultipleMatchIssue
	| InvalidUnionNoMatchIssue;

export interface InvalidKeyIssue extends ParsingIssueBase {
	readonly code: "invalid_key";
	readonly origin: "map" | "record";
	readonly issues: ParsingIssue[];
}

export interface InvalidElementIssue extends ParsingIssueBase {
	readonly code: "invalid_element";
	readonly origin: "map" | "set";
	readonly key: unknown;
	readonly issues: ParsingIssue[];
}

export interface InvalidValueIssue extends ParsingIssueBase {
	readonly code: "invalid_value";
	readonly values: PrimitiveValue[];
}

export interface CustomIssue extends ParsingIssueBase {
	readonly code: "custom";
	readonly params?: Record<string, unknown>;
}

export type PrimitiveValue =
	| bigint
	| boolean
	| null
	| number
	| string
	| symbol
	| undefined;

export type ParsingIssue =
	| CustomIssue
	| InvalidElementIssue
	| InvalidFormatIssue
	| InvalidKeyIssue
	| InvalidTypeIssue
	| InvalidUnionMultipleMatchIssue
	| InvalidUnionNoMatchIssue
	| InvalidValueIssue
	| NotMultipleOfIssue
	| TooBigIssue
	| TooSmallIssue
	| UnrecognizedKeysIssue;

/**
 * An ordered canonical validation failure returned by lightweight parsers.
 *
 * Caller-controlled invalid input is returned as this error rather than thrown.
 * Corrupt generated artifacts or package-owned registrations may still throw.
 */
export class ParsingError<_Output = unknown> extends Error {
	override readonly name = "ParsingError";

	constructor(readonly issues: ParsingIssue[]) {
		super(JSON.stringify(issues, null, 2));
	}
}
