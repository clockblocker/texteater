import { readingLegend } from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import type { PromptBody } from "../../../../../../../../assembly";

export const body =
	`PROTOTYPE ONLY: compact German Lexeme/NOUN Reading Resolution for issue #22.

The marked context shows one use of the supplied fixed Lemma. Do not revise the
Lemma. If an existing description is close enough for the learner-facing
concept, copy it exactly and answer Reuse. Otherwise answer New with one compact
emoji plus a plain-language German or learner-friendly gloss. Exact description
membership remains authoritative. Return only the compact schema.

Compact legend:
${readingLegend}

Do not return verbose property names, a Lemma, Surface, ID, Meaning, Sense,
confidence, candidates, notes, or explanation.` satisfies PromptBody;
