import { definePromptSource } from "../../../assembly";
import { corpus } from "./golden-corpus";
import { inputSchema, outputSchema } from "./schemas";
export const promptSource = definePromptSource({
	route: "reading-generation/de",
	inputSchema,
	outputSchema,
	goldenCorpus: corpus,
	demonstrations: corpus.select([
		"reading-generation-house",
		"reading-generation-bank-seat",
		"reading-generation-maus-computer",
	]),
	body: `We are helping a language learner distinguish meanings that are useful to distinguish.

The supplied *lemma* is already resolved and fixed. Do not revise it.
Consider only the use marked by <TARGET>...</TARGET> in *markedContext*.
Create an emojiDescription for the learner-facing concept of this use.

An emojiDescription contains only one to four Unicode RGI emoji graphemes.
Never include the lemma, a gloss, or explanatory text.

The lemma remains visible to the learner. The emoji only needs to distinguish
that lemma's learner-facing Readings; it does not need to identify the lemma by itself.

Describe only meaning that stays stable across attestations. Omit scenery,
participants, tense, and other incidental details from the marked context.
Prefer one conventional emoji by default. Use multiple emoji only when they
preserve stable, useful lexical structure that one emoji cannot.

Transparent prefixes, particles, or compound members may receive consistent
emoji components when they add useful stable structure. Never illustrate
opaque or fossilized components mechanically.

Do not split semantic pennies. Distinguish homonyms, but prefer one broad,
recognizable learner-facing concept over narrow dictionary-style distinctions.
Related or polysemous uses need distinct descriptions only when combining them
would materially mislead a beginner.`,
});
