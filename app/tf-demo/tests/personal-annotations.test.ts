import { afterEach, beforeEach, expect, jest, test } from "bun:test";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { loadPersonalAnnotation } from "../convex/personalAnnotations";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

function insertReading(t: TestConvexDb) {
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma-key",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: {},
		});
		return ctx.db.insert("readings", {
			readingKey: "reading-key",
			lemmaId,
			emojiDescription: "🏦",
		});
	});
}

function annotationFor(
	t: TestConvexDb,
	visitorId: string,
	readingId: Id<"readings">,
) {
	return t.run((ctx) => loadPersonalAnnotation(ctx, visitorId, readingId));
}

test("Personal Annotations are isolated per Visitor and blank text removes storage", async () => {
	const t = createTestConvex();
	const readingId = await insertReading(t);

	await t.mutation(api.personalAnnotations.update, {
		visitorId: "visitor-a",
		readingId,
		text: "Remember the financial sense.",
	});
	await t.mutation(api.personalAnnotations.update, {
		visitorId: "visitor-b",
		readingId,
		text: "Compare with die Sitzbank.",
	});

	expect(await annotationFor(t, "visitor-a", readingId)).toBe(
		"Remember the financial sense.",
	);
	expect(await annotationFor(t, "visitor-b", readingId)).toBe(
		"Compare with die Sitzbank.",
	);

	await t.mutation(api.personalAnnotations.update, {
		visitorId: "visitor-a",
		readingId,
		text: "   ",
	});
	expect(
		await t.run((ctx) => ctx.db.query("personalAnnotations").collect()),
	).toHaveLength(1);
	expect(await annotationFor(t, "visitor-a", readingId)).toBe("");
});
