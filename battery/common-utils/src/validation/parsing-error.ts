type LooseAutocomplete<T extends string> = T | (string & {});

export type ParsingPath = PropertyKey[];

type InvalidTypeExpected = LooseAutocomplete<
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
>;

interface ParsingIssueBase {
	readonly code: string;
	readonly path: ParsingPath;
	readonly message: string;
}

interface InvalidTypeIssue extends ParsingIssueBase {
	readonly code: "invalid_type";
	readonly expected: InvalidTypeExpected;
	readonly format?: string;
	readonly received?: string;
}

interface TooBigIssue extends ParsingIssueBase {
	readonly code: "too_big";
	readonly origin: string;
	readonly maximum: number | bigint;
	readonly inclusive?: boolean;
	readonly exact?: boolean;
	readonly note?: string;
}

interface TooSmallIssue extends ParsingIssueBase {
	readonly code: "too_small";
	readonly origin: string;
	readonly minimum: number | bigint;
	readonly inclusive?: boolean;
	readonly exact?: boolean;
	readonly note?: string;
}

interface InvalidFormatIssue extends ParsingIssueBase {
	readonly code: "invalid_format";
	readonly origin?: string;
	readonly format: string;
	readonly pattern?: string;
	readonly algorithm?: string;
	readonly prefix?: string;
	readonly suffix?: string;
	readonly includes?: string;
}

interface NotMultipleOfIssue extends ParsingIssueBase {
	readonly code: "not_multiple_of";
	readonly divisor: number;
}

interface UnrecognizedKeysIssue extends ParsingIssueBase {
	readonly code: "unrecognized_keys";
	readonly keys: string[];
}

interface InvalidUnionNoMatchIssue extends ParsingIssueBase {
	readonly code: "invalid_union";
	readonly errors: ParsingIssue[][];
	readonly discriminator?: string;
	readonly note?: string;
	readonly options?: PrimitiveValue[];
	readonly inclusive?: true;
}

interface InvalidUnionMultipleMatchIssue extends ParsingIssueBase {
	readonly code: "invalid_union";
	readonly errors: [];
	readonly discriminator?: string;
	readonly options?: PrimitiveValue[];
	readonly inclusive: false;
}

interface InvalidKeyIssue extends ParsingIssueBase {
	readonly code: "invalid_key";
	readonly origin: "map" | "record";
	readonly issues: ParsingIssue[];
}

interface InvalidElementIssue extends ParsingIssueBase {
	readonly code: "invalid_element";
	readonly origin: "map" | "set";
	readonly key: unknown;
	readonly issues: ParsingIssue[];
}

interface InvalidValueIssue extends ParsingIssueBase {
	readonly code: "invalid_value";
	readonly values: PrimitiveValue[];
}

interface CustomIssue extends ParsingIssueBase {
	readonly code: "custom";
	readonly params?: Record<string, unknown>;
}

type PrimitiveValue =
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
	readonly issues: ParsingIssue[];

	constructor(issues: ParsingIssue[]) {
		super(JSON.stringify(issues, null, 2));
		this.issues = issues;
	}
}
