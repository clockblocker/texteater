import type { DumgenOptions } from "../types.js";
import { choiceAnswers } from "./execution-fixture.js";

type Analysis = {
	transcription?: string | null;
	definition?: string | null;
	translations?: Record<string, string | null>;
	semanticRelations?: Record<
		string,
		{ canonicalForm: string; kind: string }[] | null
	>;
	valency?: unknown[] | null;
};
export function knowledgeFixture(
	output: unknown,
): Pick<DumgenOptions, "execute" | "judge"> {
	const analysis = output as Analysis;
	return {
		execute: async (request) => {
			if (output instanceof Error) throw output;
			const input = request.input as {
				aspect?: string;
				language?: string;
			};
			if (!analysis || typeof analysis !== "object") return { output };
			if (input.aspect === "valency")
				return { output: { valency: analysis.valency ?? [] } };
			if (input.aspect)
				return {
					output: {
						text:
							input.aspect === "translations"
								? analysis.translations?.[input.language ?? ""]
								: analysis[
										input.aspect as
											| "definition"
											| "transcription"
									],
					},
				};
			return {
				output: {
					candidates: [
						...new Set(
							Object.values(
								analysis.semanticRelations ?? {},
							).flatMap((items) =>
								(items ?? []).map((item) => item.canonicalForm),
							),
						),
					],
				},
			};
		},
		judge: async (request) => {
			const { candidates } = request.state as { candidates: string[] };
			return choiceAnswers(request.questions, (id) => {
				const candidate = candidates[Number(id.split("_")[1])];
				const entry = Object.entries(analysis.semanticRelations ?? {})
					.flatMap(([relation, items]) =>
						(items ?? []).map((item) => ({ relation, ...item })),
					)
					.find(
						(item) =>
							item.canonicalForm.trim().normalize("NFC") ===
							candidate,
					);
				if (!entry) throw Error("Missing candidate expectation");
				const question = request.questions[id];
				if (id.startsWith("kind_"))
					return question?.type === "choice" &&
						Object.hasOwn(question.criteria, entry.kind)
						? entry.kind
						: "OtherFamily";
				return entry.relation;
			});
		},
	};
}
