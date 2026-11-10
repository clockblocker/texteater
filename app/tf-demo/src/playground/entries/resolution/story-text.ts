import type { RefObject } from "react";
import { STORY_SENTENCES, storyByKey } from "./stories";
import { sentenceId } from "./story-notes";

/**
 * Clicks `key`'s word in the text under `surface`, as a reader would, once
 * the text has rendered. Returns what gives up waiting for it.
 */
export function clickStoryWord(
	surface: RefObject<HTMLElement | null>,
	key: string,
): () => void {
	const story = storyByKey(key);
	if (!story) return () => {};
	const member = story.members.at(-1) ?? 0;
	const nth = (STORY_SENTENCES[story.sentence] ?? [])
		.slice(0, member)
		.filter(({ kind }) => kind === "ResolvableText").length;
	let frame = 0;
	let tries = 0;
	const attempt = () => {
		const word = surface.current
			?.querySelector(`[data-sentence="${sentenceId(story.sentence)}"]`)
			?.querySelectorAll<HTMLElement>('[data-slot="reader-segment"]')[
			nth
		];
		if (word) word.click();
		else if (tries++ < 240) frame = requestAnimationFrame(attempt);
	};
	frame = requestAnimationFrame(attempt);
	return () => cancelAnimationFrame(frame);
}
