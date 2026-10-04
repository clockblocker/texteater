/**
 * `resolve.grammar` (#859): the stored unit a click landed on comes in, its
 * Attestation goes out, or the judge's Unresolved, or a Catalog Miss. The
 * click's language module resolves it.
 */
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import type { InvalidModelOutput, ProviderFailure } from "../errors.js";
import type { JevSettings } from "../jev-call.js";
import { type LanguageModules, languageModuleOf } from "../language-module.js";
import type { LunaSettings } from "../luna-call.js";
import type { GrammarResolution, ResolveGrammarInput } from "./types.js";

/**
 * Resolves one click. A language with no module, a Sentence whose
 * segmentation failed, or a unit that is no unit of its Sentence is bad
 * input, a Defect raised before anything is asked.
 */
export const resolveGrammar = Effect.fnUntraced(function* (
	scope: OperationScope,
	models: { readonly jev: JevSettings; readonly luna: LunaSettings },
	modules: LanguageModules,
	input: ResolveGrammarInput,
): Effect.fn.Return<GrammarResolution, ProviderFailure | InvalidModelOutput> {
	const module = languageModuleOf(modules, input.language);
	if (module === undefined)
		return yield* Effect.die(
			Error(
				`resolve.grammar resolves German ("de") only, not ${JSON.stringify(input.language)}`,
			),
		);
	if (input.sentence.failed)
		return yield* Effect.die(
			Error(
				"The Sentence's segmentation failed; segment it again before resolving a click on it",
			),
		);
	return yield* module.resolveGrammar(scope, models, input);
});
