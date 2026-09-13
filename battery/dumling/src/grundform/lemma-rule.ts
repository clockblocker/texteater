import type { GrundformRule } from "./features.js";

export function lemmaRule(message: string): GrundformRule {
	return {
		features: {},
		issue: { _tag: "LemmaRuleRequired", path: ["lemma"], message },
	};
}
export const lexicalConvention = lemmaRule(
	"This route needs the particular Lemma's canonical inflectional convention",
);
