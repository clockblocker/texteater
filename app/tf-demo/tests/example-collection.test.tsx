import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { get } from "../convex/textViews";
import { EXAMPLES_TEXT_TITLE } from "../shared/notes-study/example-contexts";
import {
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_RELATED_DATABASE,
} from "../shared/notes-study/note-study-dummy-database";
import { TextPresentation } from "../src/views/text-view";
import { consolidateExamples, load } from "../tooling/playground-fixtures";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

test("the two-stage seed presents all cases in one titled Text, including cases beyond the old nine-Sentence limit", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	await runTestMutation(db, consolidateExamples, {});
	const texts = db.rows("texts").filter((text) => !text.origin);
	expect(texts).toHaveLength(1);
	expect(texts[0]?.title).toBe(EXAMPLES_TEXT_TITLE);
	const definedUnits = [
		...NOTE_STUDY_DATABASE,
		...NOTE_STUDY_RELATED_DATABASE,
	].filter((unit) => unit.knowledge.definition);
	expect(db.rows("texts").filter((text) => text.origin)).toHaveLength(
		definedUnits.length,
	);
	expect(
		db.rows("definitionTexts").every((row) => row.state === "Ready"),
	).toBeTrue();
	const expected = [
		...NOTE_STUDY_DATABASE,
		...NOTE_STUDY_RELATED_DATABASE,
	].flatMap((unit) => unit.occurrences).length;
	const view = (await runTestQuery(db, get, {
		textId: texts[0]?._id,
		visitorId: "test",
	})) as { sentences: { heading: string; stitchedText: string }[] };
	expect(view.sentences).toHaveLength(expected);
	expect(
		view.sentences.find((sentence) => sentence.heading === "Deutschland")
			?.stitchedText,
	).toBe("Deutschland liegt in Mitteleuropa und hat neun Nachbarländer.");
});

test("moving an existing one-unit example preserves target IDs and encounter history, leaving submitted texts alone", async () => {
	const db = new IndexedTestDb({
		texts: [
			{
				_id: "texts-old",
				submissionKey: "notes-study:related-Deutschland:0",
				sourceText: "Deutschland.",
			},
			{
				_id: "texts-user",
				submissionKey: "text:user",
				sourceText: "My own text",
			},
		],
		sentences: [
			{
				_id: "sentences-de",
				textId: "texts-old",
				segmentedSentenceId:
					"notes-study:related-Deutschland:0:sentence",
				language: "de",
				position: 0,
				stitchedText: "Deutschland.",
			},
		],
		segments: [
			{
				_id: "segments-de",
				sentenceId: "sentences-de",
				index: 0,
				kind: "ResolvableText",
				text: "Deutschland",
				attestationMembership: {
					attestationId: "attestations-de",
					orthography: "Standard",
				},
			},
			{
				_id: "segments-dot",
				sentenceId: "sentences-de",
				index: 1,
				kind: "Punctuation",
				text: ".",
			},
		],
		visitorClicks: [
			{
				_id: "visitorClicks-de",
				visitorId: "visitor",
				requestId: "request",
				textId: "texts-old",
				sentenceId: "sentences-de",
				segmentId: "segments-de",
			},
		],
	});
	const result = (await runTestMutation(db, consolidateExamples, {})) as {
		textId: string;
	};
	expect(await db.get("texts-old")).toBeNull();
	expect(await db.get("texts-user")).toMatchObject({
		sourceText: "My own text",
	});
	expect(await db.get("segments-de")).toMatchObject({
		text: "Deutschland",
		attestationMembership: { attestationId: "attestations-de" },
	});
	expect(await db.get("visitorClicks-de")).toMatchObject({
		textId: result.textId,
		sentenceId: "sentences-de",
		segmentId: "segments-de",
	});
	const snapshot = db.snapshot();
	await runTestMutation(db, consolidateExamples, {});
	expect(db.snapshot()).toEqual(snapshot);
});

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
