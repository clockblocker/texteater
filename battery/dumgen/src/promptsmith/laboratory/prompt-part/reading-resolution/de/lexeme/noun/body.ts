import type { PromptBody } from "../../../../../../assembly";

export const body =
	`We are helping a language learner to make sence of the encountered word or phrase.
	Our system is designed around the simplicify and usefull-for-beginners good vibes.

	---

	Take a look at *markedContext* and tell the user is the meaning 
	of *lemma* in this context could be described by any of the already encountered
	by the user *existingEmojiDescriptions*.

	If so, respond with *Reuse* and the suitable emojiDescriptions.

	If all of the *existingEmojiDescriptions* do not fit (or there are none), 
	come up with a suitable *New* one.

	---

	Because of the learner-orineted goal of the system, we have a "do not slit semantic pennies" policy:
	the system 

	

` satisfies PromptBody;
