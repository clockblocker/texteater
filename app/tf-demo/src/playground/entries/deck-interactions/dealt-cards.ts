import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { PlaygroundSnapshot } from "../../../../tooling/playground-snapshot";
import { longestClickDeck } from "../click-deck";
import { playgroundParts } from "../playground-note";
import type { StagedParts } from "../staged-presentation";

/** One Card of the dealt Deck: its id on the table, and the Note it presents. */
export type DealtCard = {
	/** The Card's step in the click's story: `attestation`, `surface`, `lemma` or `reading`. */
	readonly id: string;
	readonly parts: StagedParts;
};

/**
 * The Deck the interaction prototype deals: one click from the fake db the
 * Notes gallery reads, the one whose Deck tells the longest story, as the
 * app deals it, back to front: the clicked text at the back and the
 * Reading in front. Each Card is the Note the app would show, told what
 * the click tells it.
 */
export function dealtCards(
	snapshot: PlaygroundSnapshot,
	follow: (target: WorkspaceTarget) => void,
): readonly DealtCard[] {
	return longestClickDeck(snapshot).map(
		({ key, target, presentationContext }) => ({
			id: (key.split(":").at(-1) ?? key).toLowerCase(),
			parts: playgroundParts({
				target,
				snapshot,
				follow,
				context: presentationContext,
			}),
		}),
	);
}
