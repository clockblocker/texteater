import type { PromptBody } from "../../../../../../assembly";

export const body =
	`Resolve a learner Reading for the supplied fixed German noun Lemma in the
marked context; never revise its grammar.

If an existingEmojiDescriptions value expresses the same learner-facing
concept, copy it exactly and answer Reuse. Otherwise answer New with one compact
emoji plus a plain-language German or learner-friendly gloss. Exact membership,
not the advisory decision, is authoritative downstream: never answer Reuse
with a changed or absent description.

Describe the target Lemma itself, never a nearby object, action, or general
sentence theme. For a room or place, choose a characteristic symbol for that
place rather than an item merely mentioned nearby.` satisfies PromptBody;
