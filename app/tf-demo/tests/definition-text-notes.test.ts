import { afterEach, beforeEach, expect, jest, test } from "bun:test";

import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import { stripAllAnalyses } from "../convex/demoReset";
import { listLibrary } from "../convex/library";
import {
	findDefinitionText,
	syncDefinitionText,
} from "../convex/model/definitionTexts";
import {
	emojiDescriptionOf,
	foldedCanonicalForm,
} from "../server/linguisticIdentity";
import { scrollTitle } from "../shared/scroll-title";
import { NOTE_STUDY_DATABASE } from "../tooling/notes-study/note-study-dummy-database";
import {
	actionContext,
	createPlaygroundConvex,
	createTestConvex,
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
	playgroundFixtures,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	claimRun,
	segmentedDefinition,
	tableRows,
} from "./support/definition-texts";

/**
 * Where a Definition Text shows: the Library leaves it out, a Reading Note
 * quotes it as a Sentence, and stripping analyses keeps it clickable. The
 * materialization lifecycle is in definition-texts.test.ts.
 */

beforeEach(() => {
	// A synced definition schedules its materializer; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
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

test("the library lists the newest loose Visitor Scrolls through an index range without Definition Texts", async () => {
	const t = createTestConvex();
	await t.run(async (ctx) => {
		for (let index = 0; index < 200; index += 1) {
			if (index % 70 === 0) {
				await ctx.db.insert("scrolls", {
					submissionKey: `visitor:${index}`,
					sourceText: `Visitor ${index}`,
				});
			}
			await ctx.db.insert("scrolls", {
				submissionKey: `definition:${index}`,
				sourceText: `Definition ${index}`,
				origin: { kind: "Definition", readingKey: `reading:${index}` },
			});
		}
	});

	expect(
		(await t.query(api.library.list, { visitorId: "visitor-1" })).map(
			(entry) => (entry.kind === "Scroll" ? entry.preview : entry.title),
		),
	).toEqual(["Visitor 140", "Visitor 70", "Visitor 0"]);

	// The Scrolls read are two index ranges over loose Visitor Scrolls, the
	// shared ones and the Visitor's own, never a filtered scan.
	const calls: string[] = [];
	await t.run((ctx) =>
		listLibrary(
			{ ...ctx, db: recordingReader(ctx.db, calls) },
			"visitor-1",
		),
	);
	const scrollRead = calls.indexOf("query:scrolls");
	const range = [
		"query:scrolls",
		"withIndex:by_origin_kind_and_placement_and_owner",
		"order:desc",
		"take",
	];
	expect(calls.slice(scrollRead, scrollRead + 8)).toEqual([
		...range,
		...range,
	]);
	expect(calls.filter((call) => call === "query:scrolls")).toHaveLength(2);
	const visitorRange = await t.run((ctx) =>
		ctx.db
			.query("scrolls")
			.withIndex("by_origin_kind_and_placement_and_owner", (q) =>
				q.eq("origin.kind", undefined),
			)
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
		const definition = defined.knowledge.definition;
		if (definition === undefined)
			throw new Error("The defined unit needs a definition.");
		const definedEmojiDescription = emojiDescriptionOf(defined.reading);
		if (definedEmojiDescription === undefined)
			throw new Error("The defined unit needs an Emoji Description.");

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
			const scrollId = definitionRow?.scrollId;
			if (!sentenceId || !scrollId)
				throw new Error("No Definition Text.");
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
					spelling: { kind: "Canonical" },
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
				await ctx.db.insert("visitorEncounters", {
					requestId: `request:${segment._id}`,
					visitorId: "visitor-1",
					scrollId,
					sentenceId,
					segmentId: segment._id,
					attestationId,
					readingId,
					encounteredAt: 1,
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
				definitionScrollId: scrollId,
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
			emojiDescription: definedEmojiDescription,
			canonicalForm: defined.reading.lemma.canonicalForm,
			reflexive: null,
		});
		// Go to source pushes the Definition Text as a Cover, like any Scroll.
		expect(context?.target).toEqual({
			kind: "Scroll",
			scrollId: seeded.definitionScrollId,
			focusAttestationId: seeded.citedAttestation,
			title: scrollTitle({ sourceText: definition }),
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
			foldedCanonicalForm: foldedCanonicalForm({
				language: "de",
				canonicalForm: readingKey,
			}),
			coreFeatures: { gender: "Neut" },
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
			spelling: { kind: "Canonical" },
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
		...segmentedDefinition(definition),
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
	// Bank is met only in a Visitor Scroll; its definition is the only source
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
	const visitorScroll = await submitText(t, [["Bank", "."]]);
	await attestSegment(t, bank, visitorScroll.segmentIds[0]?.[0]);

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
		(await tableRows(t, "scrolls")).map(({ origin }) => origin?.readingKey),
	).toEqual(["reading:der", undefined]);
	expect(
		await t.run(async (ctx) =>
			(await ctx.db.query("readings").collect()).map(
				({ readingKey }) => readingKey,
			),
		),
	).toEqual(["reading:der"]);
});
