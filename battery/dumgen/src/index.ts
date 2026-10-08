/**
 * Dumgen's public entry (Dumgen ADR 0007, #701, #859). `splitText` splits a
 * Text into paragraphs and Sentences in code; `createDumgen({ jev, luna })`
 * builds the operations: `segment.inUnits`, which turns each Sentence into
 * its Segments and its biggest units, each with its route or `Unresolved`,
 * asking jev through the host's `JevAsk`; `resolve.grammar`, which
 * resolves a stored unit's Attestation with jev judging and Luna writing;
 * `resolve.reading`, which picks a stored Emoji Description of the
 * Attestation's Lemma or writes a new one; and `knowledge.produce`, which
 * fills the resolved Reading's missing Knowledge aspect by aspect.
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
export type { LunaAsk } from "./luna.js";
export { createOpenAILuna } from "./openai-luna.js";
export type { OperationTrace } from "./operation-trace.js";
export type {
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "./resolve/types.js";
export type { Answer } from "./segment/ask.js";
export type { JevAsk, JevRequest } from "./segment/jev.js";
export type {
	Route,
	SegmentedSentence,
	SegmentedText,
	Unit,
} from "./segment/segmented-sentence.js";
export { splitText } from "./segment/split-text.js";
export { createTypeSafeAsk } from "./segment/typesafe-ask.js";
