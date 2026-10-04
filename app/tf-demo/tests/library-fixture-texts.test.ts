import { expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { createTestConvex, submitText } from "./support/convex";

test("the library flags Texts an e2e spec seeded, by their submissionKey prefix", async () => {
	const t = createTestConvex();
	const visitor = await submitText(t, [["Haus", "."]], {
		submissionKey: "text:v1:Haus.",
	});
	const seeded = await submitText(t, [["Baum", "."]], {
		submissionKey: "e2e:unit-hover",
	});

	const listed = await t.query(api.texts.list, {});
	expect(listed.map(({ textId, fixture }) => ({ textId, fixture }))).toEqual([
		{ textId: seeded.textId, fixture: true },
		{ textId: visitor.textId, fixture: undefined },
	]);
	// An ordinary Text carries no flag at all, not a false one.
	expect(
		listed.find(({ textId }) => textId === visitor.textId),
	).not.toHaveProperty("fixture");
});
