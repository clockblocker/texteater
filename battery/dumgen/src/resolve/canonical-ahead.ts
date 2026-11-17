/**
 * The Luna request a click will send before jev answers, built ahead of
 * the click (#1351): the `canonical` request of `resolve.grammar`, under
 * the same language modules and Luna configuration the click runs with, so
 * a host can ask it through OpenAI's Batch API once intake has stored the
 * Sentence and answer the click from it (`storedLunaAsk`).
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
import { canonicalStage } from "./de/canonical-form.js";
import type { ResolveGrammarInput } from "./types.js";

/** The Luna stage whose request `canonicalRequestAhead` builds. */
export const canonicalAheadStage = canonicalStage;

/**
 * The request and its output limit, or none where the click asks Luna
 * nothing before jev answers: an Unresolved unit, one the authored
 * identities resolve, one whose headword code or a stored Lemma writes, a
 * Sentence whose segmentation failed, a language with no module. The
 * `onJudged` of the input plays no part.
 */
export const canonicalRequestAhead = (
	input: ResolveGrammarInput,
): Effect.Effect<
	({ readonly request: LunaRequest } & OutputLimit) | undefined
> =>
	Effect.gen(function* () {
		const module = languageModuleOf(yield* Languages, input.language);
		if (module === undefined || input.sentence.failed) return undefined;
		const draft = module.canonicalAhead(input);
		return draft === undefined
			? undefined
			: lunaRequestOf(draft, yield* LunaConfiguration);
	});
