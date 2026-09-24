import { afterEach, beforeEach, expect, jest, test } from "bun:test";

import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import { stripAllAnalyses } from "../convex/demoReset";
import {
	definitionOf,
	findDefinitionText,
	STALE_DEFINITION_TEXT_RUN_AFTER_MS,
	syncDefinitionText,
} from "../convex/model/definitionTexts";
import { listLibraryTexts } from "../convex/texts";
import { NOTE_STUDY_DATABASE } from "../shared/notes-study/note-study-dummy-database";
import { proseSegments } from "../tooling/playground-example-collection";
import {
	actionContext,
	createPlaygroundConvex,
	createTestConvex,
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
	playgroundFixtures,
	submitText,
	type TestConvexDb,
} from "./support/convex";

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
			coreFeatures: { gender: "Neut", hyph: null },
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

/** Claims the Scheduled row's next run, as the materializer does first. */
async function claimRun(t: TestConvexDb, ownerReadingKey = READING_KEY) {
	const runNumber = await t.mutation(internal.definitionTexts.markRunning, {
		ownerReadingKey,
	});
	if (runNumber === null) throw new Error("Expected a run to claim.");
	return runNumber;
}

async function tableRows<Table extends "definitionTexts" | "texts">(
	t: TestConvexDb,
	table: Table,
) {
	return t.run((ctx) => ctx.db.query(table).collect());
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

	const firstRun = await claimRun(t);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber: firstRun,
			definition: "Ein Gebäude.",
			language: "de",
			segmentedSentenceId: "definition:test",
			segments: proseSegments("Ein Gebäude."),
		}),
	).toBe("Ready");
	const [text] = await tableRows(t, "texts");
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
		textId: text._id,
	});
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber: firstRun,
			outcome: { kind: "Ready" },
		}),
	).toBe("Settled");

	// The library never lists a Definition Text.
	expect(await t.query(api.texts.list, {})).toEqual([]);

	// Same definition again: nothing to do.
	await sync(t, { definition: "Ein Gebäude." });
	expect(await scheduledRuns(t)).toHaveLength(1);

	// A corrected definition: the old Text goes, the new one is written.
	await sync(t, { definition: "Ein Bauwerk." });
	expect(await scheduledRuns(t)).toHaveLength(2);
	await t.mutation(internal.definitionTexts.deleteTextRows, {
		ownerReadingKey: READING_KEY,
		textId: text._id,
	});
	expect(await tableRows(t, "texts")).toHaveLength(0);
	expect(await sentenceAndSegmentCounts(t)).toEqual({
		sentences: 0,
		segments: 0,
	});
	const secondRun = await claimRun(t);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber: secondRun,
			definition: "Ein Gebäude.",
			language: "de",
			segmentedSentenceId: "definition:stale",
			segments: proseSegments("Ein Gebäude."),
		}),
	).toBe("Stale");
	await t.mutation(internal.definitionTexts.persistSegmented, {
		ownerReadingKey: READING_KEY,
		runNumber: secondRun,
		definition: "Ein Bauwerk.",
		language: "de",
		segmentedSentenceId: "definition:test-2",
		segments: proseSegments("Ein Bauwerk."),
	});
	const [replacement] = await tableRows(t, "texts");
	expect(replacement?.sourceText).toBe("Ein Bauwerk.");
	if (!replacement) throw new Error("Expected a replacement Text.");

	// Retracted: the pointer clears and settling removes the state row.
	await sync(t, {});
	expect(await scheduledRuns(t)).toHaveLength(3);
	const retractingRun = await claimRun(t);
	await t.mutation(internal.definitionTexts.deleteTextRows, {
		ownerReadingKey: READING_KEY,
		textId: replacement._id,
	});
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			ownerReadingKey: READING_KEY,
			runNumber: retractingRun,
			outcome: { kind: "Retracted" },
		}),
	).toBe("Settled");
	expect(await tableRows(t, "definitionTexts")).toHaveLength(0);
	expect(await tableRows(t, "texts")).toHaveLength(0);
});

test("a definition that changed mid-run is rescheduled in the settling transaction", async () => {
	const t = createTestConvex();
	await seedReading(t);
	await sync(t, { definition: "Alt." });
	const runNumber = await claimRun(t);
	// The change lands while the run segments the old definition.
	await sync(t, { definition: "Neu." });
	expect(await scheduledRuns(t)).toHaveLength(1);
	expect(
		await t.mutation(internal.definitionTexts.persistSegmented, {
			ownerReadingKey: READING_KEY,
			runNumber,
			definition: "Alt.",
			language: "de",
			segmentedSentenceId: "definition:alt",
			segments: proseSegments("Alt."),
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
	const deadRun = await claimRun(t);
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
			segmentedSentenceId: "definition:late",
			segments: proseSegments("Neu."),
		}),
	).toBe("Stale");
	expect(
		await t.mutation(internal.definitionTexts.settle, {
			...late,
			outcome: { kind: "Failed" },
		}),
	).toBe("Ignored");

	const rerun = await claimRun(t);
	await t.mutation(internal.definitionTexts.persistSegmented, {
		ownerReadingKey: READING_KEY,
		runNumber: rerun,
		definition: "Neu.",
		language: "de",
		segmentedSentenceId: "definition:neu",
		segments: proseSegments("Neu."),
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
		(await tableRows(t, "texts")).map(({ sourceText }) => sourceText),
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

	const runNumber = await claimRun(t);
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

/** Wraps a database reader so every method called on it or its queries is named in `calls`. */
function recordingReader<Reader extends object>(
	reader: Reader,
	calls: string[],
): Reader {
	return new Proxy(reader, {
		get(target, property) {
			const value: unknown = Reflect.get(target, property, target);
			if (typeof value !== "function" || typeof property !== "string") {
				return value;
			}
			return (...args: unknown[]) => {
				calls.push(
					typeof args[0] === "string"
						? `${property}:${args[0]}`
						: property,
				);
				const result: unknown = value.apply(target, args);
				return typeof result === "object" &&
					result !== null &&
					!(result instanceof Promise)
					? recordingReader(result, calls)
					: result;
			};
		},
	});
}

test("the library lists the newest Visitor Texts through an index range without Definition Texts", async () => {
	const t = createTestConvex();
	await t.run(async (ctx) => {
		for (let index = 0; index < 200; index += 1) {
			if (index % 70 === 0) {
				await ctx.db.insert("texts", {
					submissionKey: `visitor:${index}`,
					sourceText: `Visitor ${index}`,
				});
			}
			await ctx.db.insert("texts", {
				submissionKey: `definition:${index}`,
				sourceText: `Definition ${index}`,
				origin: { kind: "Definition", readingKey: `reading:${index}` },
			});
		}
	});

	expect(
		(await t.query(api.texts.list, {})).map(({ sourceText }) => sourceText),
	).toEqual(["Visitor 140", "Visitor 70", "Visitor 0"]);

	// The read set is one index range over Visitor Texts, never a filtered scan.
	const calls: string[] = [];
	await t.run((ctx) =>
		listLibraryTexts({ ...ctx, db: recordingReader(ctx.db, calls) }),
	);
	expect(calls).toEqual([
		"query:texts",
		"withIndex:by_origin_kind",
		"order:desc",
		"take",
	]);
	const visitorRange = await t.run((ctx) =>
		ctx.db
			.query("texts")
			.withIndex("by_origin_kind", (q) => q.eq("origin.kind", undefined))
			.collect(),
	);
	expect(visitorRange.map(({ origin }) => origin)).toEqual([
		undefined,
		undefined,
		undefined,
	]);
});

test(
	"the Reading Note carries its Definition Text as a Sentence and excludes self-referencing Source Contexts",
	async () => {
		const t = createPlaygroundConvex();
		await t.mutation(playgroundFixtures.load, {});
		const [defined, cited] = NOTE_STUDY_DATABASE;
		if (!defined || !cited) throw new Error("Fixtures need two units.");

		const seeded = await t.run(async (ctx) => {
			const readingOf = async (readingKey: string) => {
				const reading = await ctx.db
					.query("readings")
					.withIndex("by_reading_key", (q) =>
						q.eq("readingKey", readingKey),
					)
					.unique();
				if (!reading) throw new Error(`Missing Reading ${readingKey}`);
				return reading;
			};
			const definedReading = await readingOf(defined.readingKey);
			const citedReading = await readingOf(cited.readingKey);
			const definitionRow = await ctx.db
				.query("definitionTexts")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", defined.readingKey),
				)
				.unique();
			const sentenceId = definitionRow?.sentenceId;
			if (!sentenceId) throw new Error("No Definition Text.");
			const segments = (
				await ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentenceId),
					)
					.collect()
			).filter(({ kind }) => kind === "ResolvableText");
			const [citedSegment, selfSegment] = segments;
			if (!citedSegment || !selfSegment)
				throw new Error("Need two words.");

			const attest = async (
				readingId: Id<"readings">,
				lemmaId: Id<"lemmas">,
				segment: typeof citedSegment,
			) => {
				const surfaceId = await ctx.db.insert("surfaces", {
					surfaceKey: `surface:${segment._id}`,
					lemmaId,
					language: "de",
					normalizedSurface: segment.text.toLowerCase(),
					spelling: "Canonical",
					surfaceFeatures: {},
				});
				const attestationId = await ctx.db.insert("attestations", {
					surfaceId,
					readingId,
					realizationCoverage: "Full",
				});
				await ctx.db.patch(segment._id, {
					attestationMembership: {
						attestationId,
						orthography: "Standard",
					},
				});
				await ctx.db.insert("visitorClicks", {
					requestId: `request:${segment._id}`,
					visitorId: "visitor-1",
					textId: definitionRow.textId,
					sentenceId,
					segmentId: segment._id,
					attestationId,
					readingId,
					clickedAt: 1,
				});
				return attestationId;
			};
			// The Visitor clicked one word of the definition; it resolved to another unit.
			const citedAttestation = await attest(
				citedReading._id,
				citedReading.lemmaId,
				citedSegment,
			);
			// Another word resolved to the defined Reading itself.
			const selfAttestation = await attest(
				definedReading._id,
				definedReading.lemmaId,
				selfSegment,
			);
			return {
				definedReadingId: definedReading._id,
				citedReadingId: citedReading._id,
				citedAttestation,
				selfAttestation,
				citedSegment,
			};
		});

		const definedNote = await t.query(api.readingNotes.get, {
			readingId: seeded.definedReadingId,
			visitorId: "visitor-1",
		});
		if (!definedNote) throw new Error("Expected the defined Reading Note.");
		expect(definedNote.definitionText.state).toBe("Ready");
		const definitionSentence =
			"sentence" in definedNote.definitionText
				? definedNote.definitionText.sentence
				: undefined;
		expect(
			definitionSentence?.segments.map(({ text }) => text).join(""),
		).toBe(defined.knowledge.definition);
		expect(
			definitionSentence?.segments.find(
				(segment) =>
					"attestationId" in segment &&
					segment.attestationId === seeded.citedAttestation,
			)?.text,
		).toBe(seeded.citedSegment.text);
		// A Reading's own definition never cites itself.
		expect(
			definedNote.sourceContexts.page.map(
				({ attestationId }) => attestationId,
			),
		).not.toContain(seeded.selfAttestation);

		const citedNote = await t.query(api.readingNotes.get, {
			readingId: seeded.citedReadingId,
			visitorId: "visitor-1",
		});
		const context = citedNote?.sourceContexts.page.find(
			({ attestationId }) => attestationId === seeded.citedAttestation,
		);
		expect(context?.origin).toEqual({
			kind: "Definition",
			readingId: seeded.definedReadingId,
			emojiDescription: defined.reading.emojiDescription,
			canonicalForm: defined.reading.lemma.canonicalForm,
		});
		expect(context?.target).toEqual({
			kind: "Reading",
			readingId: seeded.definedReadingId,
			focus: {
				kind: "Definition",
				attestationId: seeded.citedAttestation,
			},
		});
		expect(context?.segments.length).toBeGreaterThan(0);
		expect(context?.memberSegmentIndices).toEqual([
			seeded.citedSegment.index,
		]);
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

/** Stores a Reading, its Lemma, and one Surface of it. */
async function insertUnit(t: TestConvexDb, readingKey: string) {
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: `lemma:${readingKey}`,
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: readingKey,
			coreFeatures: { gender: "Neut", hyph: null },
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: "📦",
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: readingKey,
			spelling: "Canonical",
			surfaceFeatures: {},
		});
		return { readingId, surfaceId };
	});
}

/** Gives a Reading a Ready Definition Text and returns its Segments. */
async function materializeDefinition(
	t: TestConvexDb,
	readingKey: string,
	definition: string,
) {
	await t.run((ctx) => syncDefinitionText(ctx, readingKey, { definition }));
	const runNumber = await claimRun(t, readingKey);
	await t.mutation(internal.definitionTexts.persistSegmented, {
		ownerReadingKey: readingKey,
		runNumber,
		definition,
		language: "de",
		segmentedSentenceId: `definition:${readingKey}`,
		segments: proseSegments(definition),
	});
	await t.mutation(internal.definitionTexts.settle, {
		ownerReadingKey: readingKey,
		runNumber,
		outcome: { kind: "Ready" },
	});
	return definitionSegments(t, readingKey);
}

/** The Segments of a Reading's live Definition Text; none when it has none. */
function definitionSegments(t: TestConvexDb, readingKey: string) {
	return t.run(async (ctx) => {
		const sentenceId = (await findDefinitionText(ctx, readingKey))
			?.sentenceId;
		if (!sentenceId) return [];
		return ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentenceId),
			)
			.collect();
	});
}

/** Commits one single-Segment occurrence of `unit`. */
function attestSegment(
	t: TestConvexDb,
	unit: { readingId: Id<"readings">; surfaceId: Id<"surfaces"> },
	segmentId: Id<"segments"> | undefined,
) {
	if (!segmentId) throw new Error("Expected a Segment to attest.");
	return t.run(async (ctx) => {
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: unit.surfaceId,
			readingId: unit.readingId,
			realizationCoverage: "Full",
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
	});
}

test("stripping analyses keeps a surviving Reading's definition clickable and removes pruned Readings' Definition Texts", async () => {
	const t = createTestConvex();
	// An article entry: no Attestation, so stripping never prunes it.
	await insertUnit(t, "reading:der");
	await materializeDefinition(t, "reading:der", "Ein Artikel.");
	// Bank is met only in a Visitor Text; its definition is the only source
	// of Ufer, whose own definition must leave with it.
	const bank = await insertUnit(t, "reading:bank");
	const ufer = await insertUnit(t, "reading:ufer");
	const [ein, , uferWord] = await materializeDefinition(
		t,
		"reading:bank",
		"Ein Ufer.",
	);
	expect(ein?.text).toBe("Ein");
	await attestSegment(t, ufer, uferWord?._id);
	await materializeDefinition(t, "reading:ufer", "Ein Rand.");
	const visitorText = await submitText(t, [["Bank", "."]]);
	await attestSegment(t, bank, visitorText.segmentIds[0]?.[0]);

	await stripAllAnalyses(actionContext(t) as unknown as ActionCtx);

	expect(
		(await definitionSegments(t, "reading:der")).map(({ text }) => text),
	).toEqual(["Ein", " ", "Artikel", "."]);
	expect(
		(await tableRows(t, "definitionTexts")).map(
			({ ownerReadingKey, state }) => [ownerReadingKey, state],
		),
	).toEqual([["reading:der", "Ready"]]);
	expect(
		(await tableRows(t, "texts")).map(({ origin }) => origin?.readingKey),
	).toEqual(["reading:der", undefined]);
	expect(
		await t.run(async (ctx) =>
			(await ctx.db.query("readings").collect()).map(
				({ readingKey }) => readingKey,
			),
		),
	).toEqual(["reading:der"]);
});
