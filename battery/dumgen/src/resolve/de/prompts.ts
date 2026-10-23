/**
 * Every text the German grammar prompts send, each a paragraph that cites
 * the dumcorpus Rules it states at the statement hash it was last checked
 * against (ADR 0037, #695). The citation test runs dumcorpus's
 * `checkPromptCitations` over `grammarPromptTexts`, so a reworded Rule
 * fails until someone re-reads the paragraph and cites the new hash.
 *
 * German example words stand in «…», so the disjointness test (#693) can
 * keep every evaluation Lemma out of them. A template's `{…}` slots are
 * filled per click; the registered text is the template.
 */
import type { CitingPrompt } from "dumcorpus/types";
import { registry } from "./prompts/registry.js";

export { canonicalForm, routeGuidance } from "./prompts/canonical-form.js";
export {
	auxiliaryUses,
	type CaseOption,
	cellCoordinates,
	options,
} from "./prompts/options.js";
export { type PolicyName, policy } from "./prompts/policy.js";
export { question } from "./prompts/question.js";

/** Fills a template's `{slot}`s. */
export const fill = (
	template: string,
	values: Readonly<Record<string, string>>,
): string =>
	template.replace(
		/\{(\w+)\}/gu,
		(whole, key: string) => values[key] ?? whole,
	);

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function grammarPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}

/** The German examples the prompts quote, «…» stripped, each as written. */
export function promptExamples(): readonly string[] {
	return registry.examples();
}
