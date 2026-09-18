import { expect, test } from "bun:test";

import {
	deleteTextRows,
	loadSync,
	persistSegmented,
	settle,
} from "../convex/definitionTexts";
import {
	definitionOf,
	syncDefinitionText,
} from "../convex/model/definitionTexts";
import { get as getReadingNote } from "../convex/readingNotes";
import { list as listTexts } from "../convex/texts";
import { NOTE_STUDY_DATABASE } from "../shared/notes-study/note-study-dummy-database";
import { proseSegments } from "../tooling/playground-example-collection";
import { load } from "../tooling/playground-fixtures";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
	type TestRow,
} from "./support/indexed-db";

const READING_KEY = "reading:haus";

function seedReading(db: IndexedTestDb) {
	return (async () => {
		const lemmaId = await db.insert("lemmas", {
			lemmaKey: "lemma:haus",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Haus",
			coreFeatures: { gender: "Neut", hyph: null },
		});
		await db.insert("readings", {
			readingKey: READING_KEY,
			lemmaId,
			emojiDescription: "🏠",
		});
	})();
}

function mutationCtx(db: IndexedTestDb) {
	const scheduled: unknown[] = [];
	const ctx = {
		db,
		scheduler: {
			async runAfter(_delay: number, _fn: unknown, args: unknown) {
				scheduled.push(args);
			},
		},
	};
	return { ctx: ctx as never, scheduled };
}

test("definitionOf normalizes the definition aspect and ignores everything else", () => {
	expect(definitionOf({ definition: "  Ein Haus.Å " })).toBe("Ein Haus.Å");
	expect(definitionOf({ definition: "   " })).toBeNull();
	expect(definitionOf({ transcription: "haʊs" })).toBeNull();
	expect(definitionOf(null)).toBeNull();
});

test("a new definition schedules one materialization and repeats do not reschedule", async () => {
	const db = new IndexedTestDb();
	await seedReading(db);
	const { ctx, scheduled } = mutationCtx(db);

	await syncDefinitionText(ctx, READING_KEY, {});
	expect(db.rows("definitionTexts")).toHaveLength(0);

	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Gebäude." });
	expect(scheduled).toEqual([{ ownerReadingKey: READING_KEY }]);
	expect(db.rows("definitionTexts")[0]).toMatchObject({
		ownerReadingKey: READING_KEY,
		definition: "Ein Gebäude.",
		state: "Scheduled",
	});

	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Gebäude." });
	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Bauwerk." });
	expect(scheduled).toHaveLength(1);
	expect(db.rows("definitionTexts")[0]?.definition).toBe("Ein Bauwerk.");
});

test("materialization writes a hidden Definition Text, then a changed or retracted definition replaces it", async () => {
	const db = new IndexedTestDb();
	await seedReading(db);
	const { ctx, scheduled } = mutationCtx(db);
	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Gebäude." });

	const sync = await runTestQuery(db, loadSync, {
		ownerReadingKey: READING_KEY,
	});
	expect(sync).toMatchObject({
		state: "Scheduled",
		definition: "Ein Gebäude.",
		language: "de",
	});

	const persisted = await runTestMutation(db, persistSegmented, {
		ownerReadingKey: READING_KEY,
		definition: "Ein Gebäude.",
		language: "de",
		segmentedSentenceId: "definition:test",
		segments: proseSegments("Ein Gebäude."),
	});
	expect(persisted).toBe("Ready");
	const text = db.rows("texts")[0];
	expect(text).toMatchObject({
		sourceText: "Ein Gebäude.",
		origin: { kind: "Definition", readingKey: READING_KEY },
	});
	expect(db.rows("sentences")).toHaveLength(1);
	expect(db.rows("segments").map(({ text: value }) => value)).toEqual([
		"Ein",
		" ",
		"Gebäude",
		".",
	]);
	const row = db.rows("definitionTexts")[0] as TestRow;
	expect(row).toMatchObject({
		state: "Ready",
		materializedDefinition: "Ein Gebäude.",
		textId: text?._id,
	});
	expect(
		await runTestMutation(db, settle, {
			ownerReadingKey: READING_KEY,
			outcome: { kind: "Ready" },
		}),
	).toBe("Settled");

	// The library never lists a Definition Text.
	expect(await runTestQuery(db, listTexts, {})).toEqual([]);

	// Same definition again: nothing to do.
	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Gebäude." });
	expect(scheduled).toHaveLength(1);

	// A corrected definition: the old Text goes, the new one is written.
	await syncDefinitionText(ctx, READING_KEY, { definition: "Ein Bauwerk." });
	expect(scheduled).toHaveLength(2);
	await runTestMutation(db, deleteTextRows, {
		ownerReadingKey: READING_KEY,
		textId: text?._id,
	});
	expect(db.rows("texts")).toHaveLength(0);
	expect(db.rows("sentences")).toHaveLength(0);
	expect(db.rows("segments")).toHaveLength(0);
	expect(
		await runTestMutation(db, persistSegmented, {
			ownerReadingKey: READING_KEY,
			definition: "Ein Gebäude.",
			language: "de",
			segmentedSentenceId: "definition:stale",
			segments: proseSegments("Ein Gebäude."),
		}),
	).toBe("Stale");
	await runTestMutation(db, persistSegmented, {
		ownerReadingKey: READING_KEY,
		definition: "Ein Bauwerk.",
		language: "de",
		segmentedSentenceId: "definition:test-2",
		segments: proseSegments("Ein Bauwerk."),
	});
	expect(db.rows("texts")[0]?.sourceText).toBe("Ein Bauwerk.");

	// Retracted: the pointer clears and settling removes the state row.
	await syncDefinitionText(ctx, READING_KEY, {});
	expect(scheduled).toHaveLength(3);
	await runTestMutation(db, deleteTextRows, {
		ownerReadingKey: READING_KEY,
		textId: db.rows("texts")[0]?._id,
	});
	expect(
		await runTestMutation(db, settle, {
			ownerReadingKey: READING_KEY,
			outcome: { kind: "Retracted" },
		}),
	).toBe("Settled");
	expect(db.rows("definitionTexts")).toHaveLength(0);
	expect(db.rows("texts")).toHaveLength(0);
});

test("a definition that changed mid-run is rescheduled when the run settles", async () => {
	const db = new IndexedTestDb();
	await seedReading(db);
	const { ctx } = mutationCtx(db);
	await syncDefinitionText(ctx, READING_KEY, { definition: "Alt." });
	await runTestMutation(db, persistSegmented, {
		ownerReadingKey: READING_KEY,
		definition: "Alt.",
		language: "de",
		segmentedSentenceId: "definition:alt",
		segments: proseSegments("Alt."),
	});
	await db.patch(db.rows("definitionTexts")[0]?._id ?? "", {
		definition: "Neu.",
		state: "Running",
	});
	expect(
		await runTestMutation(db, settle, {
			ownerReadingKey: READING_KEY,
			outcome: { kind: "Ready" },
		}),
	).toBe("Reschedule");
	expect(db.rows("definitionTexts")[0]?.state).toBe("Scheduled");
});

test("the Reading Note carries its Definition Text as a Sentence and excludes self-referencing Source Contexts", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	const [defined, cited] = NOTE_STUDY_DATABASE;
	if (!defined || !cited) throw new Error("Fixtures need two units.");
	const readingOf = (readingKey: string) => {
		const reading = db
			.rows("readings")
			.find((row) => row.readingKey === readingKey);
		if (!reading) throw new Error(`Missing Reading ${readingKey}`);
		return reading;
	};
	const definedReading = readingOf(defined.readingKey);
	const citedReading = readingOf(cited.readingKey);
	const definitionRow = db
		.rows("definitionTexts")
		.find((row) => row.ownerReadingKey === defined.readingKey);
	if (!definitionRow?.sentenceId) throw new Error("No Definition Text.");
	const segments = db
		.rows("segments")
		.filter(
			(row) =>
				row.sentenceId === definitionRow.sentenceId &&
				row.kind === "ResolvableText",
		);
	const [citedSegment, selfSegment] = segments;
	if (!citedSegment || !selfSegment) throw new Error("Need two words.");

	// The Visitor clicked one word of the definition; it resolved to another unit.
	const citedAttestation = await db.insert("attestations", {
		surfaceId: "surfaces-cited",
		readingId: citedReading._id,
		realizationCoverage: "Full",
	});
	await db.patch(citedSegment._id, {
		attestationMembership: {
			attestationId: citedAttestation,
			orthography: "Standard",
		},
	});
	// Another word resolved to the defined Reading itself.
	const selfAttestation = await db.insert("attestations", {
		surfaceId: "surfaces-self",
		readingId: definedReading._id,
		realizationCoverage: "Full",
	});
	await db.patch(selfSegment._id, {
		attestationMembership: {
			attestationId: selfAttestation,
			orthography: "Standard",
		},
	});
	for (const [segmentId, attestationId] of [
		[citedSegment._id, citedAttestation],
		[selfSegment._id, selfAttestation],
	] as const) {
		await db.insert("visitorClicks", {
			requestId: `request:${segmentId}`,
			visitorId: "visitor-1",
			textId: definitionRow.textId,
			sentenceId: definitionRow.sentenceId,
			segmentId,
			attestationId,
			clickedAt: 1,
		});
	}

	const definedNote = (await runTestQuery(db, getReadingNote, {
		readingId: definedReading._id,
		visitorId: "visitor-1",
	})) as {
		definitionText: {
			state: string;
			sentence?: { segments: { text: string; attestationId?: string }[] };
		};
		sourceContexts: { page: { attestationId: string }[] };
	};
	expect(definedNote.definitionText.state).toBe("Ready");
	expect(
		definedNote.definitionText.sentence?.segments
			.map(({ text }) => text)
			.join(""),
	).toBe(defined.knowledge.definition);
	expect(
		definedNote.definitionText.sentence?.segments.find(
			(segment) => segment.attestationId === citedAttestation,
		)?.text,
	).toBe(citedSegment.text);
	// A Reading's own definition never cites itself.
	expect(
		definedNote.sourceContexts.page.map(
			({ attestationId }) => attestationId,
		),
	).not.toContain(selfAttestation);

	const citedNote = (await runTestQuery(db, getReadingNote, {
		readingId: citedReading._id,
		visitorId: "visitor-1",
	})) as {
		sourceContexts: {
			page: {
				attestationId: string;
				origin: unknown;
				target: unknown;
				segments: unknown[];
				memberSegmentIndices: number[];
			}[];
		};
	};
	const context = citedNote.sourceContexts.page.find(
		({ attestationId }) => attestationId === citedAttestation,
	);
	expect(context?.origin).toEqual({
		kind: "Definition",
		readingId: definedReading._id,
		emojiDescription: defined.reading.emojiDescription,
		canonicalForm: defined.reading.lemma.canonicalForm,
	});
	expect(context?.target).toEqual({
		kind: "Reading",
		readingId: definedReading._id,
		focus: { kind: "Definition", attestationId: citedAttestation },
	});
	expect(context?.segments.length).toBeGreaterThan(0);
	expect(context?.memberSegmentIndices).toEqual([Number(citedSegment.index)]);
});
