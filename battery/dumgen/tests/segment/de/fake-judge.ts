import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type {
	Answer,
	Answers,
	Ask,
	AskFailure,
	AskRequest,
} from "../../../src/segment/ask.js";
import {
	checkedRouteKey,
	routeForKey,
} from "../../../src/segment/de/routes.js";
import {
	segmentGermanUnits,
	type UnitSettings,
} from "../../../src/segment/de/units.js";
import type { Segment, Unit } from "../../../src/segment/segmented-sentence.js";

/** The unit stage's units; a stage that degraded is a Defect here, since these judges never fail. */
export const germanUnits = (
	sentence: { readonly segments: readonly Segment[] },
	ask: Ask,
	settings?: UnitSettings,
): Effect.Effect<Unit[], AskFailure> =>
	Effect.map(
		segmentGermanUnits(sentence, ask, settings),
		({ units, degraded }) => {
			if (degraded.length > 0)
				throw Error(`${degraded[0]?.stage} degraded`);
			return units;
		},
	);

export const picked = (
	choice: string,
	probabilities: Record<string, number> = { [choice]: 1 },
): Answer => ({ type: "choice", choice, confidence: 1, probabilities });
export const noul = (value: number): Answer => ({ type: "noul", noul: value });

/** A stage's `ask` from a test's function of each request; a throw is a Defect. */
export const asked =
	(answer: (request: AskRequest) => Answers | Promise<Answers>): Ask =>
	(request) =>
		Effect.promise(async () => answer(request));

/**
 * A judge that answers by question id from `answers` and otherwise says no:
 * a Noul 0.1, a Choice its last option (`none`, `Other`, …).
 */
export function fakeJudge(answers: Readonly<Record<string, Answer>> = {}) {
	const requests: AskRequest[] = [];
	const ask = asked((request) => {
		requests.push(request);
		return Object.fromEntries(
			Object.entries(request.questions).map(
				([id, question]: [string, Question]) => {
					const known = answers[id];
					if (known) return [id, known];
					if (question.type === "noul") return [id, noul(0.1)];
					const keys = Object.keys(
						question.type === "choice" ? question.criteria : {},
					);
					return [id, picked(keys.at(-1) ?? "")];
				},
			),
		);
	});
	return {
		ask,
		/** Each request's name; a merged one names its stages joined with `+`. */
		stages: () => requests.map(({ stage }) => stage),
		requests,
		/** The questions `stage` asked, alone or in a merged request. */
		questionsOf: (stage: string) => questionsOf(requests, stage),
	};
}

/** The questions `stage` asked across `requests`, alone or in a merged request. */
function questionsOf(
	requests: readonly AskRequest[],
	stage: string,
): AskRequest["questions"] | undefined {
	const asked = requests.flatMap(({ stage: name, questions, parts }) => {
		const ids = parts
			? parts[stage]
			: name === stage
				? Object.keys(questions)
				: undefined;
		return ids
			? [Object.fromEntries(ids.map((id) => [id, questions[id]]))]
			: [];
	});
	return asked.length === 0 ? undefined : Object.assign({}, ...asked);
}

/** A German route, checked against the routes the unit stage offers. */
export const route = (family: string, kind: string) => {
	const checked = routeForKey(checkedRouteKey(`${family}/${kind}`));
	if (checked === "Unresolved") throw Error("Not a route");
	return checked;
};
