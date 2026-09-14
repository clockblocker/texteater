import type { ParsingError } from "./parsing-error.js";
import {
	type Constraint,
	parseValidationArtifact,
	type ValidationOperations,
} from "./validation-artifact.js";

export const VALIDATION_PROTOCOL_VERSION = 1;

/** An immutable provider handle. Rule tables are private to the runtime. */
export interface CompiledValidationRegistry<Root extends string = string> {
	readonly version: 1;
	readonly roots: Readonly<Record<Root, true>>;
	readonly fingerprint: string;
}
interface RegistryData {
	version: 1;
	roots: Record<string, Constraint>;
	definitions: Record<string, Constraint>;
}
const registries = new WeakMap<CompiledValidationRegistry, RegistryData>();

/** Bind generated rules to the exact provider used during compilation. */
export function bindValidationRegistry<Root extends string = string>(
	encoded: string,
	fingerprint: string,
	dependency?: {
		readonly registry: CompiledValidationRegistry;
		readonly fingerprint: string;
	},
): CompiledValidationRegistry<Root> {
	const artifact = JSON.parse(encoded) as RegistryData;
	if (artifact.version !== VALIDATION_PROTOCOL_VERSION)
		throw Error(
			"Unsupported compiled validation protocol; rebuild the package",
		);
	const parent = dependency && registries.get(dependency.registry);
	if (
		dependency &&
		(!parent ||
			dependency.registry.version !== VALIDATION_PROTOCOL_VERSION ||
			dependency.registry.fingerprint !== dependency.fingerprint)
	)
		throw Error(
			"Incompatible compiled validation provider; rebuild its consumers with the same dumval runtime",
		);
	Object.setPrototypeOf(artifact.definitions, parent?.definitions ?? null);
	const roots = Object.fromEntries(
		Object.keys(artifact.roots).map((name) => [name, true]),
	);
	Object.setPrototypeOf(roots, null);
	const handle: CompiledValidationRegistry<Root> = Object.freeze({
		version: 1,
		roots: Object.freeze(roots) as Record<Root, true>,
		fingerprint,
	});
	registries.set(handle, artifact);
	return handle;
}

/** Parse with shared private rules, preserving the interpreter's exact behavior. */
export function parseCompiledValidation<Output>(
	registry: CompiledValidationRegistry,
	root: string,
	input: unknown,
	operations: ValidationOperations = {},
): Output | ParsingError<Output> {
	const artifact = registries.get(registry);
	if (!artifact)
		throw Error(
			"Unknown compiled validation provider; use the same dumval runtime",
		);
	if (!Object.hasOwn(artifact.roots, root))
		throw Error(`Missing validator ${root}`);
	return parseValidationArtifact<Output>(
		{
			version: 1,
			root: artifact.roots[root]!,
			definitions: artifact.definitions,
		},
		input,
		operations,
	);
}
