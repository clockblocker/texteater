import { afterEach, beforeEach, expect, jest, test } from "bun:test";

import { api, internal } from "../convex/_generated/api";
import {
	definitionOf,
	MAX_INTERRUPTED_DEFINITION_TEXT_RUNS,
	STALE_DEFINITION_TEXT_RUN_AFTER_MS,
	syncDefinitionText,
} from "../convex/model/definitionTexts";
import { createTestConvex, type TestConvexDb } from "./support/convex";
import {
	claimRun,
	segmentedDefinition,
	tableRows,
} from "./support/definition-texts";

const READING_KEY = "reading:haus";

beforeEach(() => {
	// A synced definition schedules its materializer; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

async function seedReading(t: TestConvexDb) {
	await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma:haus",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Haus",
			foldedCanonicalForm: "haus",
			coreFeatures: { gender: "Neut" },
		});
		await ctx.db.insert("readings", {
			readingKey: READING_KEY,
			lemmaId,
			emojiDescription: "🏠",
		});
	});
}

function sync(t: TestConvexDb, knowledge: unknown) {
	return t.run((ctx) => syncDefinitionText(ctx, READING_KEY, knowledge));
}

async function scheduled(t: TestConvexDb, name: string) {
	return (
		await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		)
	)
		.filter((job) => job.name === name)
		.map(({ args }) => args[0]);
}

/** The materializer runs that are waiting to fire. */
function scheduledRuns(t: TestConvexDb) {
	return scheduled(t, "definitionTextActions:materialize");
}

/** The watchdogs guarding scheduled runs, in order. */
function scheduledWatchdogs(t: TestConvexDb) {
	return scheduled(t, "definitionTexts:recoverStaleRun");
}

async function sentenceAndSegmentCounts(t: TestConvexDb) {
	return t.run(async (ctx) => ({
		sentences: (await ctx.db.query("sentences").collect()).length,
		segments: (await ctx.db.query("segments").collect()).length,
	}));
}

test("definitionOf normalizes the definition aspect and ignores everything else", () => {
	expect(definitionOf({ definition: "  Ein Haus.Å " })).toBe("Ein Haus.Å");
	expect(definitionOf({ definition: "   " })).toBeNull();
	expect(definitionOf({ transcription: "haʊs" })).toBeNull();
	expect(definitionOf(null)).toBeNull();
});

test("a new definition schedules one materialization and repeats do not reschedule", async () => {
	const t = createTestConvex();
	await seedReading(t);

	await sync(t, {});
	expect(await tableRows(t, "definitionTexts")).toHaveLength(0);

	await sync(t, { definition: "Ein Gebäude." });
	expect(await scheduledRuns(t)).toEqual([{ ownerReadingKey: READING_KEY }]);
	expect(await scheduledWatchdogs(t)).toEqual([
		{ ownerReadingKey: READING_KEY, runNumber: 1 },
	]);
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		ownerReadingKey: READING_KEY,
		definition: "Ein Gebäude.",
		state: "Scheduled",
	});

	await sync(t, { definition: "Ein Gebäude." });
	await sync(t, { definition: "Ein Bauwerk." });
	expect(await scheduledRuns(t)).toHaveLength(1);
	expect((await tableRows(t, "definitionTexts"))[0]?.definition).toBe(
		"Ein Bauwerk.",
	);
});

test("materialization writes a hidden Definition Text, then a changed or retracted definition replaces it", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Ein Gebäude." });

	expect(
		await t.query(internal.definitionTexts.loadSync, {
			ownerReadingKey: READING_KEY,
		}),
	).toMatchObject({
		state: "Scheduled",
		definition: "Ein Gebäude.",
		language: "de",
	});

	const firstRun = await claimRun(t, READING_KEY);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber: firstRun,
			definition: "Ein Gebäude.",
			language: "de",
			...segmentedDefinition("Ein Gebäude."),
		}),
	).toBe("Ready");
	const [text] = await tableRows(t, "scrolls");
	expect(text).toMatchObject({
		sourceText: "Ein Gebäude.",
		origin: { kind: "Definition", readingKey: READING_KEY },
	});
	if (!text) throw new Error("Expected a Definition Text.");
	expect((await sentenceAndSegmentCounts(t)).sentences).toBe(1);
	expect(
		(await t.run((ctx) => ctx.db.query("segments").collect())).map(
			({ text: value }) => value,
		),
	).toEqual(["Ein", " ", "Gebäude", "."]);
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		state: "Ready",
		materializedDefinition: "Ein Gebäude.",
		scrollId: text._id,
	});
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber: firstRun,
			outcome: { kind: "Ready" },
		}),
	).toBe("Settled");

	// The library never lists a Definition Text.
	expect(await t.query(api.library.list, { visitorId: "visitor-1" })).toEqual(
		[],
	);

	// Same definition again: nothing to do.
	await sync(t, { definition: "Ein Gebäude." });
	expect(await scheduledRuns(t)).toHaveLength(1);

	// A corrected definition: the old Scroll goes, the new one is written.
	await sync(t, { definition: "Ein Bauwerk." });
	expect(await scheduledRuns(t)).toHaveLength(2);
	await t.mutation(internal.definitionTexts.deleteScrollRows, {
		ownerReadingKey: READING_KEY,
		scrollId: text._id,
	});
	expect(await tableRows(t, "scrolls")).toHaveLength(0);
	expect(await sentenceAndSegmentCounts(t)).toEqual({
		sentences: 0,
		segments: 0,
	});
	const secondRun = await claimRun(t, READING_KEY);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber: secondRun,
			definition: "Ein Gebäude.",
			language: "de",
			...segmentedDefinition("Ein Gebäude."),
		}),
	).toBe("Stale");
	await t.mutation(internal.definitionTexts.persistSegmented, {
		ownerReadingKey: READING_KEY,
		runNumber: secondRun,
		definition: "Ein Bauwerk.",
		language: "de",
		...segmentedDefinition("Ein Bauwerk."),
	});
	const [replacement] = await tableRows(t, "scrolls");
	expect(replacement?.sourceText).toBe("Ein Bauwerk.");
	if (!replacement) throw new Error("Expected a replacement Scroll.");

	// Retracted: the pointer clears and settling removes the state row.
	await sync(t, {});
	expect(await scheduledRuns(t)).toHaveLength(3);
	const retractingRun = await claimRun(t, READING_KEY);
	await t.mutation(internal.definitionTexts.deleteScrollRows, {
		ownerReadingKey: READING_KEY,
		scrollId: replacement._id,
	});
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber: retractingRun,
			outcome: { kind: "Retracted" },
		}),
	).toBe("Settled");
	expect(await tableRows(t, "definitionTexts")).toHaveLength(0);
	expect(await tableRows(t, "scrolls")).toHaveLength(0);
});

test("a definition that changed mid-run is rescheduled in the settling transaction", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	const runNumber = await claimRun(t, READING_KEY);
	// The change lands while the run segments the old definition.
	await sync(t, { definition: "Neu." });
	expect(await scheduledRuns(t)).toHaveLength(1);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber,
			definition: "Alt.",
			language: "de",
			...segmentedDefinition("Alt."),
		}),
	).toBe("Stale");
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber,
			outcome: { kind: "Ready" },
		}),
	).toBe("Rescheduled");
	expect((await tableRows(t, "definitionTexts"))[0]?.state).toBe("Scheduled");
	expect(await scheduledRuns(t)).toHaveLength(2);
	expect((await scheduledWatchdogs(t)).at(-1)).toEqual({
		ownerReadingKey: READING_KEY,
		runNumber: 2,
	});
});

test("a materialization that never settles is run again by its watchdog, and its late writes are ignored", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	const deadRun = await claimRun(t, READING_KEY);
	// The action dies here, and a later change only records the definition.
	await sync(t, { definition: "Neu." });
	expect(await scheduledRuns(t)).toHaveLength(1);

	// A run still inside an action's lifetime is left alone and checked again.
	expect(
		await t.mutation(internal.definitionTexts.recoverStaleRun, {
			ownerReadingKey: READING_KEY,
			runNumber: deadRun,
		}),
	).toBe(false);
	expect(await scheduledWatchdogs(t)).toHaveLength(2);

	jest.setSystemTime(Date.now() + STALE_DEFINITION_TEXT_RUN_AFTER_MS);
	expect(
		await t.mutation(internal.definitionTexts.recoverStaleRun, {
			ownerReadingKey: READING_KEY,
			runNumber: deadRun,
		}),
	).toBe(true);
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		state: "Scheduled",
		definition: "Neu.",
	});
	expect(await scheduledRuns(t)).toHaveLength(2);
	expect((await scheduledWatchdogs(t)).at(-1)).toEqual({
		ownerReadingKey: READING_KEY,
		runNumber: deadRun + 1,
	});

	// The dead run's late writes no longer own the row.
	const late = {
		ownerReadingKey: READING_KEY,
		runNumber: deadRun,
	};
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			...late,
			definition: "Neu.",
			language: "de",
			...segmentedDefinition("Neu."),
		}),
	).toBe("Stale");
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			...late,
			outcome: { kind: "Failed" },
		}),
	).toBe("Ignored");

	const rerun = await claimRun(t, READING_KEY);
	await t.mutation(internal.definitionTexts.persistSegmented, {
		ownerReadingKey: READING_KEY,
		runNumber: rerun,
		definition: "Neu.",
		language: "de",
		...segmentedDefinition("Neu."),
	});
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber: rerun,
			outcome: { kind: "Ready" },
		}),
	).toBe("Settled");
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		state: "Ready",
		materializedDefinition: "Neu.",
	});
	expect(
		(await tableRows(t, "scrolls")).map(({ sourceText }) => sourceText),
	).toEqual(["Neu."]);
	// A late watchdog of the settled run finds nothing to recover.
	expect(
		await t.mutation(internal.definitionTexts.recoverStaleRun, {
			ownerReadingKey: READING_KEY,
			runNumber: rerun,
		}),
	).toBe(false);
});

test("the watchdog reruns a Scheduled row whose action never claimed it, and a failure keeps a safe message", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	jest.setSystemTime(Date.now() + STALE_DEFINITION_TEXT_RUN_AFTER_MS);
	expect(
		await t.mutation(internal.definitionTexts.recoverStaleRun, {
			ownerReadingKey: READING_KEY,
			runNumber: 1,
		}),
	).toBe(true);
	expect(await scheduledRuns(t)).toHaveLength(2);

	const runNumber = await claimRun(t, READING_KEY);
	expect(runNumber).toBe(1);
	// A duplicate action finds the run already claimed.
	expect(
		await t.mutation(internal.definitionTexts.markRunning, {
			ownerReadingKey: READING_KEY,
		}),
	).toBeNull();
	await t.mutation(internal.definitionTexts.settle, {
		ownerReadingKey: READING_KEY,
		runNumber,
		outcome: { kind: "Failed" },
	});
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Definition segmentation failed.",
	});
});

test("the watchdog fails a row whose runs keep dying, and the next Knowledge change reschedules it", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	for (let dead = 1; dead <= MAX_INTERRUPTED_DEFINITION_TEXT_RUNS; dead++) {
		const runNumber = await claimRun(t, READING_KEY);
		jest.setSystemTime(Date.now() + STALE_DEFINITION_TEXT_RUN_AFTER_MS);
		expect(
			await t.mutation(internal.definitionTexts.recoverStaleRun, {
				ownerReadingKey: READING_KEY,
				runNumber,
			}),
		).toBe(true);
	}
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		state: "Failed",
		interruptedRuns: MAX_INTERRUPTED_DEFINITION_TEXT_RUNS,
		failureMessage: "Definition segmentation failed.",
	});
	// The first run and one rerun per recovery but the last.
	expect(await scheduledRuns(t)).toHaveLength(
		MAX_INTERRUPTED_DEFINITION_TEXT_RUNS,
	);

	await sync(t, { definition: "Alt." });
	const [row] = await tableRows(t, "definitionTexts");
	expect(row).toMatchObject({ state: "Scheduled" });
	expect(row).not.toHaveProperty("interruptedRuns");
	expect(await scheduledRuns(t)).toHaveLength(
		MAX_INTERRUPTED_DEFINITION_TEXT_RUNS + 1,
	);
});

test("a run that settles ends the row's streak of dead runs", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	const deadRun = await claimRun(t, READING_KEY);
	jest.setSystemTime(Date.now() + STALE_DEFINITION_TEXT_RUN_AFTER_MS);
	await t.mutation(internal.definitionTexts.recoverStaleRun, {
		ownerReadingKey: READING_KEY,
		runNumber: deadRun,
	});
	expect((await tableRows(t, "definitionTexts"))[0]).toMatchObject({
		interruptedRuns: 1,
	});

	await t.mutation(internal.definitionTexts.settle, {
		ownerReadingKey: READING_KEY,
		runNumber: await claimRun(t, READING_KEY),
		outcome: { kind: "Failed" },
	});
	expect((await tableRows(t, "definitionTexts"))[0]).not.toHaveProperty(
		"interruptedRuns",
	);
});
