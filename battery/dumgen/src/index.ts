/**
 * Dumgen's public entry (Dumgen ADR 0007, #701, #859). It re-exports
 * Dumtext's readers and splitter, which lived here until #1294, so its
 * consumers keep their imports for now: `extractPastedText`,
 * `extractTextFile`, `scrollFromHtml`, `extractedTextFromMarkdown`
 * (consumed by filler-de#49, outside this repository, so knip's baseline
 * keeps it), `parseScroll` and `splitScroll`.
 * `operations` are Dumgen's operations, Effect 4 Effects that name the
 * models they need (Dumgen ADR 0009): `language.detect`,
 * which gives each Sentence its Detected Language (Dumgen ADR 0001);
 * `segment.inUnits`, which turns each Sentence into
 * its Segments and its biggest units, each with its route or `Unresolved`,
 * and needs `Jev` alone; `resolve.grammar`, which
 * resolves a stored unit's Attestation with jev judging and Luna writing;
 * `resolve.reading`, which picks a stored Emoji Description of the
 * Attestation's Lemma or writes a new one; `translate.sentence`, which
 * translates one Sentence with Luna (#1210); `knowledge.produce`,
 * which fills the resolved Reading's missing Knowledge aspect by aspect;
 * and `knowledge.accumulateTranslations`, which adds the translations a
 * later occurrence needs to a Reading's stored ones (ADR 0047).
 * `DumgenLive(options)` is the Layer a host provides them, once per
 * action, over its transports: `JevTransport.typeSafe` and
 * `LunaTransport.openAI` in production, `fromAsk` over a fake elsewhere,
 * both `fetch` with no `node:*` import. `TraceSink` and `TracePayloads`
 * say where each operation's trace goes and what it keeps, per program.
 */

export {
	type ExtractedText,
	extractedTextFromMarkdown,
	extractPastedText,
	extractTextFile,
	parseScroll,
	type Scroll,
	scrollFromHtml,
	splitScroll,
} from "dumtext";
export { TracePayloads, TraceSink } from "./call.js";
export { DumgenLive } from "./dumgen-live.js";
export { InvalidModelOutput, ProviderFailure } from "./errors.js";
export { Jev, JevTransport } from "./jev-call.js";
export type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "./knowledge/types.js";
export type {
	DetectedLanguage,
	LanguagedText,
} from "./language/detect.js";
export type { LunaAsk } from "./luna.js";
export { Luna, LunaTransport } from "./luna-call.js";
export type { OperationTrace } from "./operation-trace.js";
export { operations } from "./operations.js";
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
export { stitchedText } from "./segment/stitched-text.js";
export type { TranslateSentenceInput } from "./translate/types.js";
