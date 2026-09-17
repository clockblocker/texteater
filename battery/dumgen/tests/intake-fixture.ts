import type { DumgenOptions } from "../src/types.js";
import { choiceAnswers } from "./execution-fixture.js";
export function intakeFixture(
	output: unknown,
): Pick<DumgenOptions, "judge" | "execute"> {
	let current:
		| { decision: string; language: string | null; stitchedText: string }
		| undefined;
	return {
		judge: async (request) => {
			if (output instanceof Error) throw output;
			const state = request.state as { id: string; sourceText: string };
			current = (output as { items: (typeof current)[] }).items[
				Number(state.id)
			];
			if (!current) throw Error("Missing intake expectation");
			const item = current;
			return choiceAnswers(request.questions, (id) =>
				id === "language"
					? (item.language ??
						(item.decision === "UnsupportedLanguage"
							? "UnsupportedLanguage"
							: "Unresolved"))
					: id === "validity"
						? item.decision === "Unintelligible"
							? "Unintelligible"
							: "Accepted"
						: item.stitchedText === state.sourceText
							? "Unchanged"
							: "Needed",
			);
		},
		execute: async () => ({
			output: { stitchedText: current?.stitchedText },
		}),
	};
}
