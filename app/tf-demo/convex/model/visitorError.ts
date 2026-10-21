import { ConvexError, type Infer, v } from "convex/values";

const visitorErrorCodeValidator = v.union(
	v.literal("Conflict"),
	v.literal("InvalidInput"),
	v.literal("NotConfigured"),
	v.literal("RateLimited"),
);

/**
 * The data of a condition the Visitor can act on: retry after a conflict, fix
 * the input, configure the deployment, or wait out a rate limit. Anything else
 * is a bug and throws a plain Error, which the client reports generically.
 */
export type VisitorErrorData = {
	readonly code: Infer<typeof visitorErrorCodeValidator>;
	readonly message: string;
};

export function visitorError(
	code: VisitorErrorData["code"],
	message: string,
): ConvexError<VisitorErrorData> {
	return new ConvexError({ code, message });
}
