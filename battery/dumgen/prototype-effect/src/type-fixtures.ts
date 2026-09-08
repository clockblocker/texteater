import type { Effect } from "effect";
import {
	readingParser,
	type Analysis,
	type DictionaryStore,
	type InvalidModelOutput,
	type ModelTransport,
	type ProviderFailure,
	type TraceRecorder,
	typeWitnesses,
} from "./pipeline.ts";

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;
type Parsed = ReturnType<typeof readingParser.parse>;
type _ParserInference = Expect<
	Equal<
		Extract<Parsed, { reading: string }>,
		Readonly<{ reading: string; emoji: string }>
	>
>;
type _GenerationError = Expect<
	Equal<
		Effect.Effect.Error<typeof typeWitnesses.providerRequirement>,
		ProviderFailure | InvalidModelOutput
	>
>;
type _GenerationRequirements = Expect<
	Equal<
		Effect.Effect.Context<typeof typeWitnesses.providerRequirement>,
		ModelTransport | TraceRecorder
	>
>;
type _PipelineValue = Expect<
	Equal<
		Effect.Effect.Success<typeof typeWitnesses.pipelineRequirement>,
		Readonly<{ analysis: Analysis; committedRevision: number }>
	>
>;
type _PipelineRequirements = Expect<
	Equal<
		Effect.Effect.Context<typeof typeWitnesses.pipelineRequirement>,
		ModelTransport | DictionaryStore | TraceRecorder
	>
>;

interface StorageFor<L extends "de" | "en"> {
	readonly language: L;
	readonly adapterBrand: "dictionary-storage";
}
const constructDictionary = <L extends "de" | "en">(
	storage: StorageFor<L>,
): StorageFor<L> => storage;
declare const deStorage: StorageFor<"de">;
declare const enStorage: StorageFor<"en">;
const retainedDe = constructDictionary(deStorage);
// @ts-expect-error Generic construction preserves its language; an English adapter is not German storage.
const languageMismatch: StorageFor<"de"> = constructDictionary(enStorage);
void retainedDe;
void languageMismatch;
