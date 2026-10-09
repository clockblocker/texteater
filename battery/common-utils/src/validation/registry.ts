import type { ParsingError } from "./parsing-error.js";
import {
	type Constraint,
	parseValidationArtifact,
	type ValidationOperations,
} from "./validation-artifact.js";

const VALIDATION_PROTOCOL_VERSION = 1;

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
	// `encoded` is the generator's serialization of this type; its version is checked next.
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
			"Incompatible compiled validation provider; rebuild its consumers with the same common-utils/validation runtime",
		);
	Object.setPrototypeOf(artifact.definitions, parent?.definitions ?? null);
	const roots = Object.fromEntries(
		Object.keys(artifact.roots).map((name) => [name, true]),
	);
	Object.setPrototypeOf(roots, null);
	const handle: CompiledValidationRegistry<Root> = Object.freeze({
		version: 1,
		// The roots are the generated rule's root names, which the generator also
		// emits as `Root`.
		roots: Object.freeze(roots) as Record<Root, true>,
		fingerprint,
	});
	registries.set(handle, artifact);
	return handle;
}

/** Whether key names one of the registry's roots, narrowing it to that root. */
export function hasRoot<Root extends string>(
	registry: CompiledValidationRegistry<Root>,
	key: string,
): key is Root {
	return Object.hasOwn(registry.roots, key);
}

/**
 * Parse with shared private rules, preserving the interpreter's exact behavior.
 * Root comes from the registry, so a misspelled root is a type error. Output is
 * the caller's word for what the root validates: the validator was generated
 * from that type, and this is the one place the two are trusted to agree.
 */
export function parseCompiledValidation<Root extends string, Output = unknown>(
	registry: CompiledValidationRegistry<Root>,
	root: NoInfer<Root>,
	input: unknown,
	operations: ValidationOperations = {},
): Output | ParsingError<Output> {
	const artifact = registries.get(registry);
	if (!artifact)
		throw Error(
			"Unknown compiled validation provider; use the same common-utils/validation runtime",
		);
	if (!Object.hasOwn(artifact.roots, root))
		throw Error(`Missing validator ${root}`);
	const rootConstraint = artifact.roots[root];
	if (!rootConstraint) throw Error(`Missing validator ${root}`);
	return parseValidationArtifact<Output>(
		{
			version: 1,
			root: rootConstraint,
			definitions: artifact.definitions,
		},
		input,
		operations,
	);
}
