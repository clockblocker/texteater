import type { DumgenOptions } from "../types.js";
import { choiceAnswers } from "./execution-fixture.js";
export function intakeFixture(
	output: unknown,
): Pick<DumgenOptions, "judge" | "execute"> {
	type Item = {
		decision: string;
		language: string | null;
		stitchedText: string;
	};
	// Judgments run concurrently, so stitching finds its item by source text
	// rather than by whichever judgment happened to run last.
	const bySourceText = new Map<string, Item>();
	return {
		judge: async (request) => {
			if (output instanceof Error) throw output;
			const state = request.state as { id: string; sourceText: string };
			const item = (output as { items: (Item | undefined)[] }).items[
				Number(state.id)
			];
			if (!item) throw Error("Missing intake expectation");
			bySourceText.set(state.sourceText, item);
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
		execute: async (request) => {
			const { sourceText } = request.input as { sourceText: string };
			return {
				output: {
					stitchedText: bySourceText.get(sourceText)?.stitchedText,
				},
			};
		},
	};
}
