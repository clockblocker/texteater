import { expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { visitorErrorMessage } from "../src/lib/visitor-error";

test("a coded Visitor error shows its own message", () => {
	expect(
		visitorErrorMessage(
			new ConvexError({ code: "Conflict", message: "Try again." }),
		),
	).toBe("Try again.");
});

test("any other failure shows a generic message", () => {
	for (const error of [
		new Error("Index by_request_id is missing."),
		new ConvexError("An uncoded ConvexError."),
		"thrown text",
	])
		expect(visitorErrorMessage(error)).toBe("Something went wrong.");
});

test("a caller can name its own fallback for an uncoded failure", () => {
	expect(
		visitorErrorMessage(
			new Error("Index missing."),
			"Could not load more.",
		),
	).toBe("Could not load more.");
});
