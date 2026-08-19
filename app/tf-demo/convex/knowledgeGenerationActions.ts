"use node";

import { v } from "convex/values";
import type { KnowledgeDumgen } from "dumgen/knowledge-runtime";
import type { Reading } from "dumling/types";
import { defaultKnowledgeRequestMask } from "dumrel";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

let dumgenPromise: Promise<KnowledgeDumgen> | undefined;

function getKnowledgeDumgen(): Promise<KnowledgeDumgen> {
	dumgenPromise ??= Promise.all([
		import("dumgen/knowledge-runtime"),
		import("dumgen/openai-fetch"),
	]).then(([{ buildKnowledgeDumgenRuntime }, { buildOpenAiFetchSdk }]) =>
		buildKnowledgeDumgenRuntime({ sdk: buildOpenAiFetchSdk() }),
	);
	return dumgenPromise;
}

export function generationRequestFor(reading: Reading<"de">) {
	const applicable = defaultKnowledgeRequestMask(reading);
	if (!applicable) throw new Error("Unsupported Knowledge language.");
	const {
		morphologicalTree: _morphologicalTree,
		lexicalBreakdown: _lexicalBreakdown,
		...request
	} = applicable;
	return request;
}

export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { attemptKey }) => {
		await ctx.runMutation(internal.knowledgeGeneration.markRunning, {
			attemptKey,
		});
		try {
			const input = await ctx.runQuery(
				internal.knowledgeGeneration.loadInput,
				{ attemptKey },
			);
			if (!input || input.kind === "Full") return null;
			if (input.reading.lemma.language !== "de") {
				throw new Error("Unsupported Knowledge language.");
			}
			const reading = input.reading as Reading<"de">;
			const request = generationRequestFor(reading);
			const generated = await (
				await getKnowledgeDumgen()
			).generate.knowledge("de", {
				markedContext: input.markedContext,
				reading,
				request,
			});
			await ctx.runAction(
				internal.orchestration.applyGeneratedKnowledgePlan,
				{
					attemptKey,
					reading,
					changes: [...generated.changes],
					pendingRelations: [...generated.pendingRelations],
				},
			);
			return null;
		} catch (error) {
			console.error("Knowledge generation attempt failed", error);
			await ctx.runMutation(internal.knowledgeGeneration.fail, {
				attemptKey,
				failureCode: "generationFailed",
				failureMessage: "Knowledge generation failed. Please retry.",
			});
			return null;
		}
	},
});
