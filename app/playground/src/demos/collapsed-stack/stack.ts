import { useMemo, useState } from "react";
import {
	type FakeCard,
	type FixtureWord,
	germanText,
	hebrewText,
	resolveWord,
	wordsOf,
} from "@/fixtures";
import { useDemoParam } from "@/shell";

/**
 * The stack of lookups, kept in the URL as `stack=<key>,<key>,…`, oldest
 * first. A clicked word's key is its id; a lemma opened from a Card's link
 * is `~<lemma>`. Every open or close is a new history entry, so the
 * browser's back button walks the stack.
 */

const words = [...wordsOf(germanText), ...wordsOf(hebrewText)];
const lemmaMark = "~";

/** One lookup in the stack. */
export type StackEntry = {
	readonly key: string;
	/** What was looked up: a clicked word, or a lemma from a link. */
	readonly target: FixtureWord | string;
	readonly title: string;
	readonly emoji: string;
	/** The front Card's caption: the collapsed header's one line. */
	readonly gist: string;
	readonly cards: readonly FakeCard[];
};

export function stackKey(target: FixtureWord | string): string {
	return typeof target === "string" ? `${lemmaMark}${target}` : target.id;
}

function entryOf(target: FixtureWord | string): StackEntry {
	const { word, cards } = resolveWord(target);
	const front = cards.at(-1);
	return {
		key: stackKey(target),
		target,
		title: typeof target === "string" ? target : word,
		emoji: front?.emoji ?? "",
		gist: front?.caption ?? "",
		cards,
	};
}

function decodeStack(param: string | null): StackEntry[] {
	if (!param) return [];
	const seen = new Set<string>();
	const entries: StackEntry[] = [];
	for (const key of param.split(",")) {
		const target = key.startsWith(lemmaMark)
			? key.slice(lemmaMark.length)
			: words.find((word) => word.id === key);
		if (!target || seen.has(key)) continue;
		seen.add(key);
		entries.push(entryOf(target));
	}
	return entries;
}

export type Stack = {
	/** Oldest first. */
	readonly entries: readonly StackEntry[];
	/** The entry whose Cards are still being dealt one by one, if any. */
	readonly dealing: string | null;
	/**
	 * Writes the stack to the URL as a new history entry, or in place with
	 * `replace`. `dealt` names a new entry whose Cards should deal in.
	 */
	readonly write: (
		keys: readonly string[],
		options?: { readonly replace?: boolean; readonly dealt?: string },
	) => void;
	/** The dealing entry has all its Cards. */
	readonly settle: () => void;
};

export function useStack(): Stack {
	const [param, setParam] = useDemoParam("stack");
	const entries = useMemo(() => decodeStack(param), [param]);
	const [dealing, setDealing] = useState<string | null>(null);
	return {
		entries,
		dealing,
		write: (keys, { replace = false, dealt } = {}) => {
			setParam(keys.length > 0 ? keys.join(",") : null, {
				push: !replace,
			});
			if (dealt) setDealing(dealt);
		},
		settle: () => setDealing(null),
	};
}
