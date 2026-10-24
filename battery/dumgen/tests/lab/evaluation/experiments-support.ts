/**
 * The one-case segment.inUnits lab both evaluation-table test files run
 * on: its frozen set, a judge that knows the gold, and a lab directory
 * holding the set.
 */
import { join } from "node:path";
import type { SegmentInUnitsInput } from "../../../lab/evaluation/spec-corpus/segment-in-units.js";
import {
	type LabCase,
	type LabSet,
	storeSet,
} from "../../../lab/segmentation/harness/corpus.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { answerEach, zogSichAnGold } from "../segmentation/support.js";
import { segmentsOf } from "./spec-corpus/fixtures.js";

// Er0 _1 zog2 _3 sich4 _5 an6 ,7 _8 zu9 m10 _11 Glück12 .13
export const input: SegmentInUnitsInput = {
	language: "de",
	segments: [
		...segmentsOf("Er zog sich an, "),
		{ kind: "ResolvableText", text: "zu", surface: "zu" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		...segmentsOf(" Glück."),
	],
};
const route = (family: string, kind: string) => ({
	language: "de",
	family,
	kind,
});
export const labCase: LabCase = {
	id: "de/er-zog-sich-an",
	record: "de/er-zog-sich-an",
	input,
	idealOutput: {
		units: [
			{ segments: [0], route: route("Lexeme", "PRON") },
			{ segments: [2, 4, 6], route: route("Lexeme", "VERB") },
			{ segments: [9, 10, 12], route: route("Locution", "ADV") },
		],
	},
	facts: {
		coverage: "Full",
		sources: [{ target: 0 }, { target: 1 }, { target: 2 }],
	},
	rules: [],
	ruleExample: false,
};
export const set: LabSet = {
	name: "dev",
	createdAt: "",
	gitHead: "test",
	dirtyRecordFiles: 0,
	hash: "test",
	cases: [labCase],
};

/** A judge that knows the gold (`zogSichAnGold`, and zum is a Fusion), counting its calls. */
export function goldJudge() {
	const counter = { calls: 0, tokens: 0 };
	const jev: JevAsk = async (request) => {
		counter.calls++;
		counter.tokens += 100;
		const answers = answerEach(
			request.questions,
			zogSichAnGold({ source_9: "Fusion" }),
		);
		return {
			model: request.model,
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		};
	};
	return { jev, counter };
}

/** A lab under `directory` named `name`, the frozen set stored in it. */
export async function labWithSetIn(directory: string, name: string) {
	const labRoot = join(directory, name);
	const setsRoot = join(labRoot, "sets");
	await storeSet(setsRoot, set);
	return { labRoot, setsRoot };
}
