import { expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { createTestConvex, submitText } from "./support/convex";

test("the library flags Scrolls an e2e spec seeded, by their submissionKey prefix", async () => {
	const t = createTestConvex();
	const visitor = await submitText(t, [["Haus", "."]], {
		submissionKey: "text:v1:Haus.",
	});
	const seeded = await submitText(t, [["Baum", "."]], {
		submissionKey: "e2e:unit-hover",
	});

	const listed = await t.query(api.scrolls.list, {});
	expect(
		listed.map(({ scrollId, fixture }) => ({ scrollId, fixture })),
	).toEqual([
		{ scrollId: seeded.scrollId, fixture: true },
		{ scrollId: visitor.scrollId, fixture: undefined },
	]);
	// An ordinary Scroll carries no flag at all, not a false one.
	expect(
		listed.find(({ scrollId }) => scrollId === visitor.scrollId),
	).not.toHaveProperty("fixture");
});
