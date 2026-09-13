// README_BLOCK:basic-usage:start

import { buildDumgen } from "dumgen";
import { buildKnowledgeDumgenRuntime } from "dumgen/knowledge-runtime";
import { buildOpenAiFetchModelGenerator } from "dumgen/openai-fetch";
import type { Reading } from "dumling-old/types";
import * as Effect from "effect/Effect";

const modelGenerator = buildOpenAiFetchModelGenerator();
const dumgen = buildDumgen({ modelGenerator });
const knowledge = buildKnowledgeDumgenRuntime({ modelGenerator });

const program = Effect.gen(function* () {
 const segmented = yield* dumgen.segment(["Die Bank ist geöffnet."]);
 const decision = segmented[0];
 if (decision?.decision !== "Accepted" || decision.language !== "de") return;
 const grammatical = yield* dumgen.resolve.grammatical("de", {
  sentence: decision.sentence,
  clickedSegmentIndex: 2,
 });
 const reading = yield* dumgen.resolve.reading("de", {
  markedContext: grammatical.markedContext,
  lemma: grammatical.attestation.surface.lemma,
  existingEmojiDescriptions: [],
 });
 return yield* knowledge.generate.knowledge("de", {
  markedContext: grammatical.markedContext,
  reading: { lemma: grammatical.attestation.surface.lemma, emojiDescription: reading.emojiDescription } as Reading<"de">,
  request: { transcription: null, definition: null, translations: { en: null } },
 });
});
// Execute once at the host boundary; typed failures remain in the Effect above.
console.log(await Effect.runPromise(program));
// README_BLOCK:basic-usage:end
