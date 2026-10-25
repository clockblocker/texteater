import { expect, test } from "bun:test";
import {
	breakdownStandIns,
	standInAnswers,
} from "../../../lab/segmentation/harness/round.js";
import { choice, noul } from "../../../src/segment/ask.js";

const questions = {
	analysis: choice("How was it built?", {
		a0: "one",
		a1: "two",
		none: "none",
	}),
	l_0: noul("Is it a fixed expression?"),
	only: choice("Which?", { f0: "single" }),
};

test("the Breakdown stand-ins contest a Choice's pick and answer a Noul no, unlike the shared stand-ins", () => {
	const request = { stage: "breakdown-analysis", questions };
	expect(breakdownStandIns(request)).toEqual({
		analysis: {
			type: "choice",
			choice: "a0",
			confidence: 1,
			probabilities: { a0: 0.7, a1: 0.3 },
		},
		l_0: { type: "noul", noul: 0.1 },
		only: {
			type: "choice",
			choice: "f0",
			confidence: 1,
			probabilities: { f0: 1 },
		},
	});
	expect(standInAnswers(request)).toMatchObject({
		analysis: { choice: "a0", probabilities: { a0: 1 } },
		l_0: { noul: 0.9 },
	});
});
