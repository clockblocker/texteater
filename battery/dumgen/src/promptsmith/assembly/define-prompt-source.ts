import type {
	PromptInputSchema,
	PromptOutputSchema,
	PromptSource,
} from "./contracts";
import { getGoldenCorpusState, tryGetSelectionState } from "./golden-corpus";
import { getLocalDemonstrationState } from "./local-demonstrations";

export function definePromptSource<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
>(
	args: PromptSource<InputSchema, OutputSchema>,
): PromptSource<InputSchema, OutputSchema> {
	if (args.route.trim().length === 0) {
		throw new Error("Prompt Source route must not be empty.");
	}
	if (args.body.trim().length === 0) {
		throw new Error(`Prompt Source "${args.route}" has an empty body.`);
	}
	const canonicalCorpus =
		args.goldenCorpus === undefined
			? undefined
			: getGoldenCorpusState(args.goldenCorpus);
	if (canonicalCorpus !== undefined) {
		if (canonicalCorpus.route !== args.route) {
			throw new Error(
				`Prompt Source "${args.route}" cannot own Golden Corpus "${canonicalCorpus.route}".`,
			);
		}
		if (
			canonicalCorpus.inputSchema !== args.inputSchema ||
			canonicalCorpus.outputSchema !== args.outputSchema
		) {
			throw new Error(
				`Prompt Source "${args.route}" and its Golden Corpus must share the same schema instances.`,
			);
		}
	}
	if (args.demonstrations !== undefined) {
		const selection = tryGetSelectionState(args.demonstrations);
		if (selection !== undefined) {
			if (
				canonicalCorpus === undefined ||
				selection.corpus.identity !== canonicalCorpus.identity
			) {
				throw new Error(
					`Prompt Source "${args.route}" can select demonstrations only from its canonical Golden Corpus.`,
				);
			}
		} else {
			const local = getLocalDemonstrationState(args.demonstrations);
			if (local === undefined) {
				throw new Error(
					`Prompt Source "${args.route}" has demonstrations that were not validated by Prompt Assembly.`,
				);
			}
			if (
				local.inputSchema !== args.inputSchema ||
				local.outputSchema !== args.outputSchema
			) {
				throw new Error(
					`Prompt Source "${args.route}" and its local demonstrations must share the same schema instances.`,
				);
			}
		}
	}
	return Object.freeze({ ...args });
}
