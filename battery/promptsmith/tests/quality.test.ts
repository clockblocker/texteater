import { expect, test } from "bun:test";
import { summarizeQuality } from "promptsmith/evaluation";

test("execution success is not semantic acceptance", () => {
	expect(
		summarizeQuality([
			{ status: "Success", evaluation: { contractPass: true } },
			{ status: "Success", evaluation: { contractPass: false } },
			{
				status: "Success",
				evaluation: { contractPass: null, needsReview: true },
			},
			{ status: "Success", evaluation: { exactMatch: true } },
			{ status: "InvalidOutput", evaluation: { contractPass: true } },
		]),
	).toEqual({ passed: 1, failed: 1, needsReview: 1, unscored: 2 });
});
