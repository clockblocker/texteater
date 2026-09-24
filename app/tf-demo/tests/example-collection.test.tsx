import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { api } from "../convex/_generated/api";
import type { TableNames } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { EXAMPLES_TEXT_TITLE } from "../shared/notes-study/example-contexts";
import {
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_RELATED_DATABASE,
} from "../shared/notes-study/note-study-dummy-database";
import { TextPresentation } from "../src/views/text-view";
import {
	createPlaygroundConvex,
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
	playgroundFixtures,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test(
	"the two-stage seed presents all cases in one titled Text, including cases beyond the old nine-Sentence limit",
	async () => {
		const t = createPlaygroundConvex();
		await t.mutation(playgroundFixtures.load, {});
		await t.mutation(playgroundFixtures.consolidateExamples, {});
		const allTexts = await t.run((ctx) => ctx.db.query("texts").collect());
		const texts = allTexts.filter((text) => !text.origin);
		expect(texts).toHaveLength(1);
		expect(texts[0]?.title).toBe(EXAMPLES_TEXT_TITLE);
		const definedUnits = [
			...NOTE_STUDY_DATABASE,
			...NOTE_STUDY_RELATED_DATABASE,
		].filter((unit) => unit.knowledge.definition);
		expect(allTexts.filter((text) => text.origin)).toHaveLength(
			definedUnits.length,
		);
		expect(
			(
				await t.run((ctx) => ctx.db.query("definitionTexts").collect())
			).every((row) => row.state === "Ready"),
		).toBeTrue();
		const expected = [
			...NOTE_STUDY_DATABASE,
			...NOTE_STUDY_RELATED_DATABASE,
		].flatMap((unit) => unit.occurrences).length;
		const textId = texts[0]?._id;
		if (!textId) throw new Error("Expected the examples Text.");
		const view = await t.query(api.textViews.get, {
			textId,
			visitorId: "test",
		});
		expect(view?.sentences).toHaveLength(expected);
		expect(
			view?.sentences.find(
				(sentence) => sentence.heading === "Deutschland",
			)?.stitchedText,
		).toBe("Deutschland liegt in Mitteleuropa und hat neun Nachbarländer.");
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

test("moving an existing one-unit example preserves target IDs and encounter history, leaving submitted texts alone", async () => {
	const t = createPlaygroundConvex();
	const seeded = await t.run(async (ctx) => {
		const oldTextId = await ctx.db.insert("texts", {
			submissionKey: "notes-study:related-Deutschland:0",
			sourceText: "Deutschland.",
		});
		const userTextId = await ctx.db.insert("texts", {
			submissionKey: "text:user",
			sourceText: "My own text",
		});
		const sentenceId = await ctx.db.insert("sentences", {
			textId: oldTextId,
			segmentedSentenceId: "notes-study:related-Deutschland:0:sentence",
			language: "de",
			position: 0,
			stitchedText: "Deutschland.",
		});
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma:Deutschland",
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
			canonicalForm: "Deutschland",
			coreFeatures: {},
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: await ctx.db.insert("surfaces", {
				surfaceKey: "surface:Deutschland",
				lemmaId,
				language: "de",
				normalizedSurface: "Deutschland",
				spelling: "Canonical",
				surfaceFeatures: {},
			}),
			readingId: await ctx.db.insert("readings", {
				readingKey: "reading:Deutschland",
				lemmaId,
				emojiDescription: "🇩🇪",
			}),
			realizationCoverage: "Full",
		});
		const segmentId = await ctx.db.insert("segments", {
			sentenceId,
			index: 0,
			kind: "ResolvableText",
			text: "Deutschland",
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		await ctx.db.insert("segments", {
			sentenceId,
			index: 1,
			kind: "Punctuation",
			text: ".",
		});
		const clickId = await ctx.db.insert("visitorClicks", {
			visitorId: "visitor",
			requestId: "request",
			textId: oldTextId,
			sentenceId,
			segmentId,
			clickedAt: 1,
		});
		return {
			oldTextId,
			userTextId,
			sentenceId,
			segmentId,
			attestationId,
			clickId,
		};
	});

	const result = await t.mutation(playgroundFixtures.consolidateExamples, {});

	await t.run(async (ctx) => {
		expect(await ctx.db.get(seeded.oldTextId)).toBeNull();
		expect(await ctx.db.get(seeded.userTextId)).toMatchObject({
			sourceText: "My own text",
		});
		expect(await ctx.db.get(seeded.segmentId)).toMatchObject({
			text: "Deutschland",
			attestationMembership: { attestationId: seeded.attestationId },
		});
		expect(await ctx.db.get(seeded.clickId)).toMatchObject({
			textId: result.textId,
			sentenceId: seeded.sentenceId,
			segmentId: seeded.segmentId,
		});
	});
	const snapshot = await everyRow(t);
	await t.mutation(playgroundFixtures.consolidateExamples, {});
	expect(await everyRow(t)).toEqual(snapshot);
});

/** Every row in every table, for comparing whole-database states. */
function everyRow(t: TestConvexDb) {
	return t.run(async (ctx) =>
		Object.fromEntries(
			await Promise.all(
				(Object.keys(schema.tables) as TableNames[]).map(
					async (table) => [
						table,
						await ctx.db.query(table).collect(),
					],
				),
			),
		),
	);
}

test("case subtitles render as headings outside selectable Segments", () => {
	const html = renderToStaticMarkup(
		<TextPresentation
			sentences={[
				{
					sentenceId: "sentences-de" as never,
					position: 0,
					language: "de",
					stitchedText: "Deutschland liegt in Mitteleuropa.",
					sourceText: "Deutschland liegt in Mitteleuropa.",
					heading: "Deutschland",
					segments: [
						{
							index: 0,
							kind: "ResolvableText",
							text: "Deutschland",
							encountered: false,
						},
					],
				},
			]}
			focus={{ kind: "None" }}
			selectedSegmentKey={null}
			onSegmentClick={async () => {}}
		/>,
	);
	expect(html).toMatch(/<h2[^>]*>Deutschland<\/h2>/);
	expect(html.match(/data-slot="reader-segment"/g)).toHaveLength(1);
});
