import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type {
	Answer,
	Answers,
	Ask,
	AskRequest,
} from "../../../src/segment/ask.js";
import {
	checkedRouteKey,
	routeForKey,
} from "../../../src/segment/de/routes.js";

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
	return { ask, stages: () => requests.map(({ stage }) => stage), requests };
}

/** A German route, checked against the routes the unit stage offers. */
export const route = (family: string, kind: string) => {
	const checked = routeForKey(checkedRouteKey(`${family}/${kind}`));
	if (checked === "Unresolved") throw Error("Not a route");
	return checked;
};
