import type { DumgenOptions } from "../src/types.js";
import { queuedTargetJudgment, readingJudgment } from "./execution-fixture.js";
import { grammarFixture } from "./grammar-fixture.js";
import { intakeFixture } from "./intake-fixture.js";

/** Queue canonical stage expectations; each stage may now make several traced calls. */
export function pipelineFixture(
	outputs: unknown[],
): Pick<DumgenOptions, "execute" | "judge"> {
	const classify = queuedTargetJudgment(outputs);
	let grammar: DumgenOptions | undefined;
	let intake: ReturnType<typeof intakeFixture> | undefined;
	return {
		judge: async (request, options) => {
			if (Object.hasOwn(request.questions, "language")) {
				if ((request.state as { id: string }).id === "0")
					intake = intakeFixture(outputs.shift());
				if (!intake) throw Error("Missing intake fixture");
				return intake.judge(request, options);
			}
			if (Object.hasOwn(request.questions, "reading")) {
				const output = outputs[0];
				const result = await readingJudgment(output)(request, options);
				const answer = result.answers.reading;
				if (answer?.type === "choice" && answer.choice !== "NoMatch")
					outputs.shift();
				return result;
			}
			if (Object.hasOwn(request.questions, "support"))
				grammar = grammarFixture(outputs.shift());
			if (
				Object.hasOwn(request.questions, "support") ||
				Object.hasOwn(request.questions, "identity") ||
				Object.hasOwn(request.questions, "hasGovPrep") ||
				Object.hasOwn(request.questions, "hasSepPrefix") ||
				Object.hasOwn(
					request.questions,
					"surface.inflectionalFeatures.case",
				) ||
				Object.hasOwn(request.questions, "attachment")
			) {
				if (!grammar) throw Error("Missing grammar fixture");
				return grammar.judge(request, options);
			}
			return classify(request, options);
		},
		execute: async (request) => {
			if (request.stage === "segment") {
				if (!intake) throw Error("Missing intake fixture");
				return intake.execute(request);
			}
			if (
				request.input &&
				typeof request.input === "object" &&
				"needed" in request.input
			) {
				if (!grammar) throw Error("Unexpected text generation");
				return grammar.execute(request);
			}
			const output = outputs.shift();
			if (output instanceof Error) throw output;
			return { output };
		},
	};
}
