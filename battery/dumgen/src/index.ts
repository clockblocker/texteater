/**
 * Dumgen's public entry (Dumgen ADR 0007, #701, #859). `splitText` splits a
 * Text into paragraphs and Sentences in code; `createDumgen({ jev, luna })`
 * builds the operations: `segment.inUnits`, which turns each Sentence into
 * its Segments and its biggest units, each with its route or `Unresolved`,
 * asking jev through the host's `JevAsk`, and `resolve.grammar`, which
 * resolves a stored unit's Attestation with jev judging and Luna writing.
 * The operations are Effect 4 Effects. `createTypeSafeAsk` and
 * `createOpenAILuna` are the production transports: `fetch` to the
 * TypeSafe and OpenAI APIs, with no `node:*` import.
 */
export {
	createDumgen,
	type Dumgen,
	type DumgenOptions,
} from "./create-dumgen.js";
export { InvalidModelOutput, ProviderFailure } from "./errors.js";
export {
	defaultLunaConfiguration,
	type LunaAsk,
	type LunaConfiguration,
	type LunaRequest,
	type LunaResponse,
} from "./luna.js";
export { createOpenAILuna, type OpenAILunaOptions } from "./openai-luna.js";
export type {
	BudgetWait,
	CallFailure,
	CallTrace,
	OperationTrace,
	ResolutionOutcome,
	SentenceOutcome,
} from "./operation-trace.js";
export type {
	GrammarResolution,
	LemmaCandidate,
	NeighbourSentences,
	ResolveGrammarInput,
} from "./resolve/types.js";
export type { Answer, Answers } from "./segment/ask.js";
export type { GermanInventory } from "./segment/de/inventory.js";
export type { InUnitsInput } from "./segment/in-units.js";
export {
	type JevAsk,
	type JevRequest,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "./segment/jev.js";
export type {
	ClosedClassIdentity,
	Route,
	Segment,
	SegmentedSentence,
	SegmentedText,
	SegmentLanguage,
	Unit,
} from "./segment/segmented-sentence.js";
export { type SplitText, splitText } from "./segment/split-text.js";
export {
	createTypeSafeAsk,
	type Fetch,
	type TypeSafeAskOptions,
} from "./segment/typesafe-ask.js";
