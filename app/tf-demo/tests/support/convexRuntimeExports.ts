import type { GenericValidator } from "convex/values";

/**
 * Convex's runtime-only introspection members, which its public types mark
 * internal and omit: every validator has a `json` getter, and every
 * registered function has `exportArgs()` and `exportReturns()` that
 * stringify its validators, and `_handler`, the function it registered.
 */
type ValidatorRuntimeExports = { readonly json: unknown };
type RegisteredFunctionRuntimeExports = {
	exportArgs(): string;
	exportReturns(): string;
	_handler(ctx: unknown, args: unknown): Promise<unknown>;
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

/**
 * The handler a Convex function registered, callable with a stub context so a
 * test can inject a failure the runtime would never produce on demand.
 */
export function registeredHandler(
	registered: RegisteredFunction,
): (ctx: unknown, args: unknown) => Promise<unknown> {
	return (registered as RegisteredFunction & RegisteredFunctionRuntimeExports)
		._handler;
}
