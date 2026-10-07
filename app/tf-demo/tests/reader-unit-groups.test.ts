import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { segmentGroups } from "../src/views/reader-sentence";
import { SentenceList } from "../src/views/text-view";

type SentenceSegmentView = NonNullable<
	FunctionReturnType<typeof api.textViews.get>
>["sentences"][number]["segments"][number];
type Unit = NonNullable<SentenceSegmentView["unit"]>;

const verb: Unit["route"] = { language: "de", family: "Lexeme", kind: "VERB" };
const noun: Unit["route"] = { language: "de", family: "Lexeme", kind: "NOUN" };

// Fixture ids stand in for Convex document ids; grouping only compares them.
const SENTENCE_ID = "sentence_1" as Id<"sentences">;
const PLAN_ATTESTATION_ID = "attestation_plan" as Id<"attestations">;

const words = [
	"Sie",
	" ",
	"gibt",
	" ",
	"den",
	" ",
	"alten",
	" ",
	"Plan",
	" ",
	"auf",
	".",
];

const units: readonly Unit[] = [
	{ segments: [0], route: "Unresolved" },
	{ segments: [2, 10], route: verb },
	{ segments: [4, 8], route: noun },
	{ segments: [6], route: "Unresolved" },
];

/** `Sie gibt den alten Plan auf.` as intake stores it: `gibt … auf` holds `den … Plan`. */
function sentenceSegments(
	attested: Readonly<Record<number, Id<"attestations">>> = {},
): SentenceSegmentView[] {
	return words.map((text, index): SentenceSegmentView => {
		const unit = units.find(({ segments }) => segments.includes(index));
		const attestationId = attested[index];
		if (!unit)
			return {
				index,
				kind: text === "." ? "Punctuation" : "Whitespace",
				text,
				encountered: false,
			};
		return {
			index,
			kind: "ResolvableText",
			text,
			encountered: false,
			unit,
			...(attestationId ? { attestationId } : {}),
		};
	});
}

test("every member of a discontinuous unit maps to the whole unit, and nested units stay apart", () => {
	const groups = segmentGroups(sentenceSegments());

	expect(groups.get(2)).toEqual([2, 10]);
	expect(groups.get(10)).toEqual([2, 10]);
	expect(groups.get(4)).toEqual([4, 8]);
	expect(groups.get(8)).toEqual([4, 8]);
	expect(groups.get(6)).toEqual([6]);
	expect(groups.has(1)).toBeFalse();
	expect(groups.has(11)).toBeFalse();
});

test("an attested Segment groups by its occurrence, and its unit keeps the rest", () => {
	const groups = segmentGroups(
		sentenceSegments({ 8: PLAN_ATTESTATION_ID, 6: PLAN_ATTESTATION_ID }),
	);

	expect(groups.get(6)).toEqual([6, 8]);
	expect(groups.get(8)).toEqual([6, 8]);
	// `den` lost `Plan` to the occurrence and now stands alone.
	expect(groups.get(4)).toEqual([4]);
	expect(groups.get(2)).toEqual([2, 10]);
});

test("a Segment without a stored unit groups with itself only", () => {
	const groups = segmentGroups(
		sentenceSegments().map(({ unit: _unit, ...segment }) => segment),
	);

	expect(groups.get(2)).toEqual([2]);
	expect(groups.get(10)).toEqual([10]);
});

test("selecting one member of an unattested unit marks the whole unit selected", () => {
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: SENTENCE_ID,
					position: 0,
					language: "de",
					stitchedText: "Sie gibt den alten Plan auf.",
					segments: sentenceSegments(),
				},
			],
			selectedSegmentKey: "sentence_1:10",
			onSegmentClick: async () => {},
		}),
	);

	expect(markup.match(/data-state="selected"/g)).toHaveLength(2);
	for (const word of ["gibt", "auf"]) {
		expect(buttonMarkup(markup, word)).toContain('data-state="selected"');
		expect(buttonMarkup(markup, word)).toContain('aria-pressed="true"');
	}
	for (const word of ["Sie", "den", "alten", "Plan"])
		expect(buttonMarkup(markup, word)).toContain('aria-pressed="false"');
});

test("a selected unit keeps its look on the member whose click came back Unresolved", () => {
	const segments = sentenceSegments().map((segment) =>
		segment.index === 10
			? {
					...segment,
					encountered: true,
					resolutionState: "Unresolved" as const,
				}
			: segment,
	);
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: SENTENCE_ID,
					position: 0,
					language: "de",
					stitchedText: "Sie gibt den alten Plan auf.",
					segments,
				},
			],
			selectedSegmentKey: "sentence_1:10",
			onSegmentClick: async () => {},
		}),
	);

	expect(buttonMarkup(markup, "gibt")).toContain('data-state="selected"');
	expect(buttonMarkup(markup, "auf")).toContain('data-state="selected"');
});

test("a Sentence intake could not segment shows as not segmented, each word without a unit", () => {
	const markup = renderToStaticMarkup(
		createElement(SentenceList, {
			sentences: [
				{
					sentenceId: SENTENCE_ID,
					position: 0,
					language: "de",
					stitchedText: "Sie gibt den alten Plan auf.",
					segmentationFailed: true,
					segments: sentenceSegments().map(
						({ unit: _unit, ...segment }) => segment,
					),
				},
			],
			selectedSegmentKey: null,
			onSegmentClick: async () => {},
		}),
	);

	expect(markup).toContain('data-segmentation="failed"');
	expect(markup).toContain('title="Not segmented"');
	expect(buttonMarkup(markup, "gibt")).toContain(
		'aria-label="gibt, in a sentence that is not segmented"',
	);
});

function buttonMarkup(markup: string, text: string): string {
	return markup.match(new RegExp(`<button[^>]*>${text}</button>`))?.[0] ?? "";
}
