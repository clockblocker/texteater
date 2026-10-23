import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import type { CodeRule } from "../../../src/segment/de/code-rules.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";
import { fakeJudge, noul } from "./fake-judge.js";

/** The units' Segment groups without the rule and with it, from the same answers. */
export async function groups(
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>>,
	rule: CodeRule,
) {
	const of = async (rules: readonly CodeRule[]) =>
		(
			await Effect.runPromise(
				segmentGermanUnits({ segments }, fakeJudge(answers).ask, {
					...productionUnitSettings,
					rules,
				}),
			)
		).map((unit) => unit.segments);
	return { without: await of([]), with: await of([rule]) };
}

/** Fixed words with every pair of them one expression. */
export function fixedWords(...ids: number[]): Record<string, Answer> {
	const answers: Record<string, Answer> = {};
	for (const [position, id] of ids.entries()) {
		answers[`f_${id}`] = noul(0.95);
		for (const other of ids.slice(position + 1))
			answers[`e_${id}_${other}`] = noul(0.9);
	}
	return answers;
}
