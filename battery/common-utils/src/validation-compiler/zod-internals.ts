/**
 * The Zod internals the validation compiler reads, and the error it throws
 * on a schema it cannot compile.
 */

export class ZodValidationCompilationError extends Error {
	override readonly name = "ZodValidationCompilationError";
}

export type ZodInternals = Readonly<{
	_zod: Readonly<{
		check?: (...args: never[]) => unknown;
		def: ZodDefinition;
		parent?: unknown;
	}>;
}>;

export type ZodDefinition = Readonly<{
	catchall?: unknown;
	check?: string;
	checks?: readonly unknown[];
	discriminator?: string;
	element?: unknown;
	entries?: Readonly<Record<string, unknown>>;
	error?: (...args: never[]) => unknown;
	fn?: (...args: never[]) => unknown;
	format?: string;
	getter?: () => unknown;
	in?: unknown;
	innerType?: unknown;
	items?: readonly unknown[];
	keyType?: unknown;
	length?: number;
	inclusive?: boolean;
	maximum?: number;
	minimum?: number;
	options?: readonly unknown[];
	out?: unknown;
	pattern?: RegExp;
	rest?: unknown;
	shape?: Readonly<Record<string, unknown>> | (() => Record<string, unknown>);
	transform?: (...args: never[]) => unknown;
	tx?: (...args: never[]) => unknown;
	type?: string;
	value?: number;
	values?: readonly unknown[];
	valueType?: unknown;
}>;

export function assertNoErrorCustomization(
	definition: ZodDefinition,
	schemaName: string,
	path: string,
	construct: string,
): void {
	if (definition.error !== undefined) {
		throw unsupported(schemaName, path, `${construct} error customization`);
	}
}

export function zodInternals(
	value: unknown,
	schemaName: string,
	path: string,
): ZodInternals {
	if (
		value === null ||
		typeof value !== "object" ||
		!("_zod" in value) ||
		value._zod === null ||
		typeof value._zod !== "object" ||
		!("def" in value._zod)
	) {
		throw unsupported(schemaName, path, "value without Zod internals");
	}
	// Zod's internals are private; the shape this compiler reads is checked above.
	return value as ZodInternals;
}

export function unsupported(
	schemaName: string,
	path: string,
	construct: string,
): ZodValidationCompilationError {
	return new ZodValidationCompilationError(
		`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct}.`,
	);
}
