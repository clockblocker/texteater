import type { PromptBody } from "../../../../assembly";

export const body =
	`We are helping a language learner distinguish meanings that are useful to distinguish.

The supplied *lemma* is already resolved and fixed. Do not revise it.
Consider only the use marked by <TARGET>...</TARGET> in *markedContext*.

Choose whether this use belongs to one of the learner's existing Readings for
this lemma:

- Choose *Reuse* when an *existingEmojiDescription* is close enough to represent
  the same learner-facing concept. Copy that description exactly.
- Choose *New* when none is close enough, or when there are no existing
  descriptions. Create a description that is not already in the supplied list.

An emojiDescription contains only one emoji or a compact emoji sequence.
Never include the lemma, a gloss, or explanatory text.

We follow a "do not split semantic pennies" policy:

1. Different homonyms need different emoji descriptions.
2. Related or polysemous uses should reuse one description unless doing so would
   materially mislead a beginner.
3. Prefer one broad, recognizable learner-facing concept over narrow
   dictionary-style distinctions.

The decision and description must agree: *Reuse* requires an exact member of
*existingEmojiDescriptions*; *New* requires a description that is not an exact
member.` satisfies PromptBody;
