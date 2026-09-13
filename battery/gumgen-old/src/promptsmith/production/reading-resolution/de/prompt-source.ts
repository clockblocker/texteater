import { definePromptSource } from "../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

/** Follows `battery/dumgen/docs/reference/human-owned/prompting-philosophy.md`. */
const body = `We are helping a language learner distinguish meanings that are useful to distinguish.

The supplied *lemma* is already resolved and fixed. Do not revise it.
Consider only the use marked by <TARGET>...</TARGET> in *markedContext*.

Choose whether this use belongs to one of the learner's existing Readings for
this lemma:

- Choose *Reuse* when an *existingEmojiDescription* is close enough to represent
  the same learner-facing concept. Copy that description exactly.
- Choose *New* when none is close enough, or when there are no existing
  descriptions. Create a description that is not already in the supplied list.

An emojiDescription contains only one to four Unicode RGI emoji graphemes.
Never include the lemma, a gloss, or explanatory text.

The lemma remains visible to the learner. The emoji only needs to distinguish
that lemma's learner-facing Readings; it does not need to identify the lemma by
itself.

Describe only meaning that stays stable across attestations. Omit scenery,
participants, tense, and other incidental details from the marked context.
Prefer one conventional emoji by default. Use multiple emoji only when they
preserve stable, useful lexical structure that one emoji cannot.

Transparent prefixes, particles, or compound members may receive consistent
emoji components when they add useful stable structure. Never illustrate
opaque or fossilized components mechanically.

We follow a "do not split semantic pennies" policy:

1. Different homonyms need different emoji descriptions.
2. Related or polysemous uses should reuse one description unless doing so would
   materially mislead a beginner.
3. Prefer one broad, recognizable learner-facing concept over narrow
   dictionary-style distinctions.

The decision and description must agree: *Reuse* requires an exact member of
*existingEmojiDescriptions*; *New* requires a description that is not an exact
member.`;

const demonstrations = corpus.select([
	"reading-de-key-metaphor",
	"reading-de-maus-computer",
	"reading-de-aufstehen-uprising",
	"reading-de-adp-mit-connector",
	"reading-de-idiom-mit-den-woelfen-heulen",
]);

export const promptSource = definePromptSource({
	route: "reading-resolution/de",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
