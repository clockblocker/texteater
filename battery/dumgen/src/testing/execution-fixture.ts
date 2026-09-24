import type { TypeSafeExecutor } from "promptsmith/typesafe";
import type { ModelExecutor, ModelRequest } from "../types.js";

/** Injected outputs check projection and orchestration, never live linguistic accuracy. */
export function executeOutput(
	execute: (request: ModelRequest) => Promise<unknown>,
): ModelExecutor {
	return async (request) => ({ output: await execute(request) });
}
export const rejectJudgment: TypeSafeExecutor = async () => {
	throw Error("Unexpected TypeSafe judgment in this fixture");
};

/** Bounded deterministic answers for orchestration tests, not a linguistic model. */
export function choiceAnswers<
	Q extends import("promptsmith/typesafe").Questions,
>(
	questions: Q,
	select: (id: string) => string,
): import("promptsmith/typesafe").SystemOneResult<Q> {
	return {
		model: "injected",
		usage: { input_tokens: 1, output_tokens: 1 },
		answers: Object.fromEntries(
			Object.entries(questions).map(([id, question]) => {
				if (question.type !== "choice") throw Error("Expected Choice");
				const selected = select(id);
				return [
					id,
					{
						type: "choice",
						choice: selected,
						confidence: 1,
						probabilities: Object.fromEntries(
							Object.keys(question.criteria).map((key) => [
								key,
								key === selected ? 1 : 0,
							]),
						),
					},
				];
			}),
		),
	} as import("promptsmith/typesafe").SystemOneResult<Q>;
}
export function queuedTargetJudgment(outputs: unknown[]): TypeSafeExecutor {
	return async (request) => {
		const output = outputs[0] as {
			family?: string;
			kind?: string;
			memberSegmentIndices?: readonly number[];
			decision?: string;
		};
		if (!output || (!output.family && output.decision !== "Unresolved"))
			throw Error("Expected an injected canonical target");
		if (Object.hasOwn(request.questions, "route")) outputs.shift();
		return choiceAnswers(request.questions, (id) =>
			id === "singletonRoute"
				? "Unresolved"
				: id === "route"
					? output.decision === "Unresolved"
						? "Unresolved"
						: `${output.family}/${output.kind}`
					: output.memberSegmentIndices?.includes(Number(id.slice(7)))
						? "Include"
						: "Exclude",
		);
	};
}

export function readingJudgment(output: unknown): TypeSafeExecutor {
	return async (request) => {
		if (output instanceof Error) throw output;
		const description =
			typeof output === "string"
				? output
				: (output as { emojiDescription?: string })?.emojiDescription;
		const state = request.state as {
			candidates?: string[];
			readings?: { emojiDescription: string }[];
		};
		// Several reviewed Readings on one Lemma: pick the one the expectation names.
		if (state.readings) {
			const reviewed = state.readings.findIndex(
				(reading) => reading.emojiDescription === description,
			);
			return choiceAnswers(request.questions, () =>
				reviewed < 0 ? "Unresolved" : `authored_${reviewed}`,
			);
		}
		const index = (state.candidates ?? []).indexOf(description ?? "");
		return choiceAnswers(request.questions, () =>
			index < 0 ? "NoMatch" : `candidate_${index}`,
		);
	};
}
