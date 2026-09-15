import { expect, test } from "bun:test";

import {
	loadPersonalAnnotation,
	update as updatePersonalAnnotation,
} from "../convex/personalAnnotations";
import { IndexedTestDb, runTestMutation } from "./support/indexed-db";

test("Personal Annotations are isolated per Visitor and blank text removes storage", async () => {
	const db = new IndexedTestDb({
		readings: [
			{
				_id: "readings-1",
				readingKey: "reading-key",
				lemmaId: "lemmas-1",
				emojiDescription: "🏦",
			},
		],
	});

	await runTestMutation(db, updatePersonalAnnotation, {
		visitorId: "visitor-a",
		readingId: "readings-1",
		text: "Remember the financial sense.",
	});
	await runTestMutation(db, updatePersonalAnnotation, {
		visitorId: "visitor-b",
		readingId: "readings-1",
		text: "Compare with die Sitzbank.",
	});

	await expect(
		loadPersonalAnnotation(
			{ db } as never,
			"visitor-a",
			"readings-1" as never,
		),
	).resolves.toBe("Remember the financial sense.");
	await expect(
		loadPersonalAnnotation(
			{ db } as never,
			"visitor-b",
			"readings-1" as never,
		),
	).resolves.toBe("Compare with die Sitzbank.");

	await runTestMutation(db, updatePersonalAnnotation, {
		visitorId: "visitor-a",
		readingId: "readings-1",
		text: "   ",
	});
	expect(db.rows("personalAnnotations")).toHaveLength(1);
	await expect(
		loadPersonalAnnotation(
			{ db } as never,
			"visitor-a",
			"readings-1" as never,
		),
	).resolves.toBe("");
});
