import { type RefObject, useCallback, useLayoutEffect, useRef } from "react";

export type WorkspaceSentenceRevealRequest = {
	anchor: HTMLElement;
	presentationId: string;
};

export type WorkspaceSentenceRevealOptions<S> = {
	root: RefObject<HTMLElement | null>;
	state: S;
	/** Wait until the state update that opened the destination has settled. */
	isReady(state: S): boolean;
	/** Finds the Card Layer that should leave room for the selected sentence. */
	findDeck(
		root: HTMLElement,
		pending: WorkspaceSentenceRevealRequest,
		state: S,
	): HTMLElement | null;
};

/**
 * Queues a selected sentence for a post-render reveal above a newly opened
 * Card Layer. The caller owns its workspace state and DOM-to-layer adapter.
 */
export function useWorkspaceSentenceReveal<S>({
	root,
	state,
	isReady,
	findDeck,
}: WorkspaceSentenceRevealOptions<S>) {
	const pendingRef = useRef<WorkspaceSentenceRevealRequest | null>(null);

	useLayoutEffect(() => {
		const pending = pendingRef.current;
		const workspaceRoot = root.current;
		if (!pending || !workspaceRoot || !isReady(state)) return;
		pendingRef.current = null;

		const deck = findDeck(workspaceRoot, pending, state);
		const sheet = pending.anchor.closest<HTMLElement>(".workspace__sheet");
		const sentence = pending.anchor.closest<HTMLElement>(
			".text-reader__sentence",
		);
		if (!deck || !sheet || !sentence?.isConnected) return;

		const lineHeight = Number.parseFloat(
			getComputedStyle(sentence).lineHeight,
		);
		if (!Number.isFinite(lineHeight)) return;
		const excess =
			sentence.getBoundingClientRect().bottom -
			(deck.getBoundingClientRect().top - lineHeight * 0.5);
		// Prioritize the sentence ending if the whole sentence cannot fit above the deck.
		if (excess > 0) sheet.scrollTop += excess;
	}, [findDeck, isReady, root, state]);

	return useCallback((anchor: HTMLElement, presentationId: string) => {
		pendingRef.current = { anchor, presentationId };
	}, []);
}
