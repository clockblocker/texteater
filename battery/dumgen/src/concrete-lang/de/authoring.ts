import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	definePromptSource,
	type GoldenCaseRegistry,
	type PromptSource,
	stableJson,
} from "promptsmith";
import { z } from "zod";

export const grammarInputSchema = z.strictObject({
	markedContext: z.string().min(1),
	members: z.array(z.string().min(1)).min(1),
	/** The neighbouring Sentences a caller supplies for a referent. */
	context: z
		.strictObject({
			before: z.string().min(1).optional(),
			after: z.string().min(1).optional(),
		})
		.optional(),
	/** Whether the Text has neighbouring Sentences; absent means it has. */
	contextAvailable: z.boolean().optional(),
});
/** Source-local schemas validate every retained answer before demonstrations are assembled. */
export function defineLinguisticCorpus<
	I extends z.ZodType,
	O extends z.ZodType,
>(args: {
	route: string;
	inputSchema: I;
	outputSchema: O;
	cases: unknown;
	demonstrationIds: readonly string[];
	source: string;
}): Omit<PromptSource<I, O>, "body"> {
	const cases = args.cases as GoldenCaseRegistry<I, O>;
	const corpus = defineGoldenCorpus({
		route: args.route,
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		collections: {
			canonical: defineGoldenCaseCollection(args.source, { cases }),
		},
		fingerprintInput: (input) => {
			const {
				markedContext,
				context: neighbours,
				contextAvailable,
			} = input as {
				markedContext?: unknown;
				context?: unknown;
				contextAvailable?: unknown;
			};
			if (typeof markedContext !== "string") return stableJson(input);
			const sentence = markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de");
			// The same Sentence with other neighbours is another case.
			return neighbours === undefined && contextAvailable === undefined
				? sentence
				: `${sentence} ${stableJson({ neighbours, contextAvailable })}`;
		},
	});
	return {
		route: args.route,
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		goldenCorpus: corpus,
		demonstrations: corpus.select(args.demonstrationIds),
	};
}

export type LinguisticCorpus = Omit<PromptSource, "body">;
/** Only active text generation and deferred prototypes have prompt bodies. */
export function defineLinguisticPrompt<
	I extends z.ZodType,
	O extends z.ZodType,
>(
	args: Parameters<typeof defineLinguisticCorpus<I, O>>[0] & {
		body: string;
		outputFormat?: "text" | "json";
	},
): PromptSource<I, O> {
	return definePromptSource({
		...defineLinguisticCorpus(args),
		body: args.body,
		outputFormat: args.outputFormat,
	});
}
