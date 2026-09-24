import { ConvexError } from "convex/values";

/**
 * What to tell the Visitor about a failed call: the message of a coded
 * condition they can act on, and a generic apology for anything else.
 */
export function visitorErrorMessage(error: unknown): string {
	if (error instanceof ConvexError) {
		const data: unknown = error.data;
		if (
			typeof data === "object" &&
			data !== null &&
			"message" in data &&
			typeof data.message === "string"
		)
			return data.message;
	}
	return "Something went wrong.";
}
