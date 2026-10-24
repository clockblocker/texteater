/**
 * The named operations a compiled schema requires: the registrations a
 * custom, contextual, overwrite or transform check, a customized regex, a
 * discriminated union or a readonly node must match, and the signatures
 * recorded for them.
 */
import type { z } from "zod";

import type { Constraint } from "../validation/validation-artifact.js";
import {
	unsupported,
	type ZodDefinition,
	ZodValidationCompilationError,
} from "./zod-internals.js";

export type ZodValidationSemanticOperationConstruct =
	| "custom"
	| "contextual"
	| "overwrite"
	| "transform";

export type ZodValidationOperationRegistration =
	| Readonly<{
			construct: ZodValidationSemanticOperationConstruct;
			error?: (...args: never[]) => unknown;
			implementation: (...args: never[]) => unknown;
			name: string;
			version: number;
	  }>
	| Readonly<{
			construct: "discriminator";
			discriminator: string;
			name: string;
			options: readonly string[];
			schema: z.ZodType;
			version: number;
	  }>
	| Readonly<{
			construct: "readonly";
			name: string;
			schema: z.ZodType;
			version: number;
	  }>
	| Readonly<{
			check: object;
			construct: "regex";
			flags: string;
			message: string;
			name: string;
			schema: z.ZodType;
			source: string;
			version: number;
	  }>;

export type ZodValidationOperationSignature = Readonly<{
	discriminator?: Readonly<{
		branches: readonly Constraint[];
		key: string;
		options: readonly string[];
	}>;
	errorMessage?: string;
	regex?: Readonly<{ flags: string; source: string }>;
	version: number;
}>;

/** The compilation state an operation registration is matched against and recorded in. */
export type OperationContext = {
	readonly operations: readonly ZodValidationOperationRegistration[];
	readonly operationSignatures: Record<
		string,
		ZodValidationOperationSignature
	>;
	readonly requiredOperations: Set<string>;
};

export function validateOperationRegistrations(
	registrations: readonly ZodValidationOperationRegistration[],
): void {
	const names = new Set<string>();
	for (const registration of registrations) {
		if (registration.name.length === 0) {
			throw new ZodValidationCompilationError(
				"A Zod validation operation has an empty name.",
			);
		}
		if (
			!Number.isSafeInteger(registration.version) ||
			registration.version < 1
		) {
			throw new ZodValidationCompilationError(
				`Zod validation operation ${JSON.stringify(registration.name)} has an invalid version.`,
			);
		}
		if (names.has(registration.name)) {
			throw new ZodValidationCompilationError(
				`Duplicate Zod validation operation name: ${registration.name}.`,
			);
		}
		names.add(registration.name);
	}
}

export function registeredDiscriminatorOperation(
	schemaIdentity: object,
	discriminator: string,
	options: readonly string[],
	branches: readonly Constraint[],
	schemaName: string,
	path: string,
	context: OperationContext,
): string {
	const registration = context.operations.find(
		(candidate) =>
			candidate.construct === "discriminator" &&
			candidate.schema === schemaIdentity,
	);
	if (registration?.construct !== "discriminator") {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported discriminated union; no exact schema-identity registration matched.`,
		);
	}
	if (
		registration.discriminator !== discriminator ||
		registration.options.length !== options.length ||
		registration.options.some((option, index) => option !== options[index])
	) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: registered discriminator metadata does not match the canonical schema discriminator key and options.`,
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		discriminator: {
			branches,
			key: registration.discriminator,
			options: [...registration.options],
		},
		version: registration.version,
	};
	return registration.name;
}

export function registeredRegexOperation(
	schemaIdentity: object,
	checkIdentity: object,
	definition: ZodDefinition,
	pattern: RegExp,
	schemaName: string,
	path: string,
	context: OperationContext,
): string {
	const registration = context.operations.find(
		(
			candidate,
		): candidate is Extract<
			ZodValidationOperationRegistration,
			{ construct: "regex" }
		> =>
			candidate.construct === "regex" &&
			candidate.schema === schemaIdentity &&
			candidate.check === checkIdentity,
	);
	if (registration === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported customized regex check; no explicitly named operation registration matched.`,
		);
	}
	if (
		registration.source !== pattern.source ||
		registration.flags !== pattern.flags
	) {
		throw unsupported(
			schemaName,
			path,
			"customized regex registration pattern metadata mismatch",
		);
	}
	const message = constantErrorMessage(
		{ construct: registration.construct, error: definition.error },
		schemaName,
		path,
	);
	if (registration.message !== message) {
		throw unsupported(
			schemaName,
			path,
			"customized regex registration message mismatch",
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		errorMessage: message,
		regex: { flags: registration.flags, source: registration.source },
		version: registration.version,
	};
	return registration.name;
}

export function registeredOperation(
	construct: ZodValidationSemanticOperationConstruct,
	implementation: ((...args: never[]) => unknown) | undefined,
	errorCustomization: ((...args: never[]) => unknown) | undefined,
	schemaName: string,
	path: string,
	context: OperationContext,
): string {
	let constructMatch:
		| Extract<
				ZodValidationOperationRegistration,
				{ implementation: (...args: never[]) => unknown }
		  >
		| undefined;
	for (const candidate of context.operations) {
		if (
			candidate.construct !== "discriminator" &&
			candidate.construct === construct &&
			candidate.implementation === implementation
		) {
			constructMatch = candidate;
			break;
		}
	}
	if (constructMatch === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct} check; no explicitly named operation registration matched.`,
		);
	}
	if (constructMatch.error !== errorCustomization) {
		throw unsupported(
			schemaName,
			path,
			`${construct} check error customization that does not match its named operation registration`,
		);
	}
	const registration = constructMatch;
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		...(registration.error === undefined
			? {}
			: {
					errorMessage: constantErrorMessage(
						registration,
						schemaName,
						path,
					),
				}),
		version: registration.version,
	};
	return registration.name;
}

export function registeredSchemaOperation(
	construct: "readonly",
	schemaIdentity: object,
	schemaName: string,
	path: string,
	context: OperationContext,
): string {
	const registration = context.operations.find(
		(
			candidate,
		): candidate is Extract<
			ZodValidationOperationRegistration,
			{ construct: "readonly" }
		> =>
			candidate.construct === construct &&
			candidate.schema === schemaIdentity,
	);
	if (registration === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct} node; no explicitly named operation registration matched.`,
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		version: registration.version,
	};
	return registration.name;
}

function constantErrorMessage(
	registration: Readonly<{
		construct: string;
		error?: (...args: never[]) => unknown;
	}>,
	schemaName: string,
	path: string,
): string {
	const error = registration.error;
	if (error === undefined) {
		throw new TypeError("Expected an error customization.");
	}
	let results: unknown[];
	try {
		// A registration's error may take any parameters; the probe calls it
		// with Zod's issue contexts to show it ignores them.
		const probe = error as (context?: unknown) => unknown;
		results = [
			probe(),
			probe({ input: "text" }),
			probe({ input: 0 }),
			probe({ input: null }),
		];
	} catch {
		throw unsupported(
			schemaName,
			path,
			`${registration.construct} check error customization that is not a constant message`,
		);
	}
	const messages = results.map(errorMessageFromResult);
	const [message] = messages;
	if (
		message === undefined ||
		messages.some((candidate) => candidate !== message)
	) {
		throw unsupported(
			schemaName,
			path,
			`${registration.construct} check error customization that is not a constant message`,
		);
	}
	return message;
}

function errorMessageFromResult(result: unknown): string | undefined {
	return typeof result === "string"
		? result
		: result !== null &&
				typeof result === "object" &&
				"message" in result &&
				typeof result.message === "string"
			? result.message
			: undefined;
}
