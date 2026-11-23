/**
 * The Luna request a click will send before jev answers, built ahead of
 * the click (#1351): the `canonical` request of `resolve.grammar` on its
 * guess at jev's answers, or, where code writes the headword of a Lemma
 * with no stored or authored Reading, the `emojiDescription` draft beside
 * jev. It is built under the same language modules and Luna configuration
 * the click runs with, so a host can ask it through OpenAI's Batch API once
 * intake has stored the Sentence and answer the click from it
 * (`storedLunaAsk`).
 */
import * as Effect from "effect/Effect";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import {
	LunaConfiguration,
	type LunaRequest,
	lunaRequestOf,
	type OutputLimit,
} from "../luna.js";
import type { SegmentLanguage } from "../segment/segmented-sentence.js";
import { canonicalStage } from "./de/canonical-form.js";
import { emojiDescriptionStage } from "./reading.js";
import type { ResolveGrammarInput } from "./types.js";

/** The Luna stages whose requests `lunaRequestAhead` builds. */
export const lunaAheadStages: ReadonlySet<string> = new Set([
	canonicalStage,
	emojiDescriptionStage,
]);

/** A request asked ahead of its click: its stage, the request, its output limit. */
export type LunaRequestAhead = {
	readonly stage: string;
	readonly request: LunaRequest;
} & OutputLimit;

/**
 * The request, its stage and its output limit, or none where the click
 * asks Luna nothing before jev answers: an Unresolved unit, one the
 * authored identities resolve, one whose headword a stored Lemma writes,
 * one whose headword code writes where its Readings may exist, a Sentence
 * whose segmentation failed, a language with no module. A click sends at
 * most one such request. The `onJudged` of the input plays no part.
 */
export const lunaRequestAhead = <L extends SegmentLanguage>(
	input: ResolveGrammarInput<L>,
): Effect.Effect<LunaRequestAhead | undefined> =>
	Effect.gen(function* () {
		const module = languageModuleOf(yield* Languages, input.language);
		if (module === undefined || input.sentence.failed) return undefined;
		const ahead = module.lunaAhead(input);
		return ahead === undefined
			? undefined
			: {
					stage: ahead.stage,
					...lunaRequestOf(ahead.draft, yield* LunaConfiguration),
				};
	});
