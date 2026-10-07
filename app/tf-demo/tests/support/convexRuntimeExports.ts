import type { GenericValidator } from "convex/values";

/**
 * Convex's runtime-only introspection members, which its public types mark
 * internal and omit: every validator has a `json` getter, and every
 * registered function has `exportArgs()` and `exportReturns()` that
 * stringify its validators.
 */
type ValidatorRuntimeExports = { readonly json: unknown };
type RegisteredFunctionRuntimeExports = {
	exportArgs(): string;
	exportReturns(): string;
};

/** A registered query, mutation, or action of any visibility. */
type RegisteredFunction = { readonly isConvexFunction: true };

/** The JSON description Convex derives from a validator at runtime. */
export function validatorJson(validator: GenericValidator): unknown {
	return (validator as GenericValidator & ValidatorRuntimeExports).json;
}

/** The stringified args validator of a registered Convex function. */
export function exportedArgs(registered: RegisteredFunction): string {
	return (
		registered as RegisteredFunction & RegisteredFunctionRuntimeExports
	).exportArgs();
}

/** The stringified returns validator of a registered Convex function. */
export function exportedReturns(registered: RegisteredFunction): string {
	return (
		registered as RegisteredFunction & RegisteredFunctionRuntimeExports
	).exportReturns();
}
