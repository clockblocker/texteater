import type { PromptBody } from "../../../../assembly";

export const body =
	`We are helping a language learner to make sense of the encountered word or phrase.
	Our system is designed around the simplicity and useful-for-beginners good vibes.

	---

	Take a look at *markedContext* and tell the user if the meaning
	of *lemma* in this context could be described by any of the *existingEmojiDescriptions*
	already encountered by the user.

	If so, respond with *Reuse* and the suitable emojiDescription.

	If all of the *existingEmojiDescriptions* do not fit (or there are none),
	come up with a suitable *New* one.

	---

	Because of the learner-oriented goal of the system, we have a "do not split semantic pennies" policy:
	1) Homonyms always deserve different emojis.
	2) Polysemes deserve different emojis only if really necessary. Aka: we are ok with collapsing some of them into one good-enough emojiDescription.
` satisfies PromptBody;
