import type { DumgenOptions } from "../src/types.js";
import { queuedTargetJudgment } from "./execution-fixture.js";
import { grammarFixture } from "./grammar-fixture.js";

/** Queue canonical stage expectations; each stage may now make several traced calls. */
export function pipelineFixture(
	outputs: unknown[],
): Pick<DumgenOptions, "execute" | "judge"> {
	const classify = queuedTargetJudgment(outputs);
	let grammar: DumgenOptions | undefined;
	return {
		judge: async (request, options) => {
			if (Object.hasOwn(request.questions, "support"))
				grammar = grammarFixture(outputs.shift());
			if (
				Object.hasOwn(request.questions, "support") ||
				Object.hasOwn(request.questions, "identity") ||
				Object.hasOwn(request.questions, "hasGovPrep") ||
				Object.hasOwn(request.questions, "hasSepPrefix")
			) {
				if (!grammar) throw Error("Missing grammar fixture");
				return grammar.judge(request, options);
			}
			return classify(request, options);
		},
		execute: async (request) => {
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
