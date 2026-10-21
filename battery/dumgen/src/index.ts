/**
 * Dumgen's public entry (Dumgen ADR 0007, #701, #859). `extractPastedText`
 * turns pasted text into the one Scroll of its Extracted Text (#1176,
 * #1189), `extractTextFile` reads a `.txt` file into Sections and Scrolls
 * (#1190), `scrollFromHtml` maps a parsed HTML tree into one Scroll
 * (#1195), `extractedTextFromMarkdown` reads a Markdown document into
 * Sections and Scrolls (#1176, #1205; consumed by filler-de#49, outside this
 * repository, so knip's baseline keeps it), `parseScroll` checks a stored
 * Scroll without Zod, and `splitScroll` splits one into paragraphs and
 * Sentences in code with the language-neutral `splitText`.
 * `createDumgen({ jev, luna })` builds the operations: `language.detect`,
 * which gives each Sentence its Detected Language (Dumgen ADR 0001);
 * `segment.inUnits`, which turns each Sentence into
 * its Segments and its biggest units, each with its route or `Unresolved`,
 * asking jev through the host's `JevAsk`; `resolve.grammar`, which
 * resolves a stored unit's Attestation with jev judging and Luna writing;
 * `resolve.reading`, which picks a stored Emoji Description of the
 * Attestation's Lemma or writes a new one; `translate.sentence`, which
 * translates one Sentence with Luna (#1210); `knowledge.produce`,
 * which fills the resolved Reading's missing Knowledge aspect by aspect;
 * and `knowledge.accumulateTranslations`, which adds the translations a
 * later occurrence needs to a Reading's stored ones (ADR 0047).
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
	type ExtractedText,
	extractPastedText,
	type Scroll,
} from "./extracted-text/extracted-text.js";
export { scrollFromHtml } from "./extracted-text/html.js";
export { extractedTextFromMarkdown } from "./extracted-text/markdown.js";
export { parseScroll } from "./extracted-text/parse.js";
export { extractTextFile } from "./extracted-text/plain-text/text-file.js";
export { splitScroll } from "./extracted-text/split.js";
export type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "./knowledge/types.js";
export type {
	DetectedLanguage,
	LanguagedText,
} from "./language/detect.js";
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
export { stitchedText } from "./segment/stitched-text.js";
export { createTypeSafeAsk } from "./segment/typesafe-ask.js";
export type { TranslateSentenceInput } from "./translate/types.js";
