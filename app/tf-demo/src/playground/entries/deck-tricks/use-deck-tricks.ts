import { useLayoutEffect, useRef, useState } from "react";
import {
	bysuit,
	deal,
	fanOut,
	flip,
	poker,
	shuffle,
	sort,
	type Trick,
	turnDown,
} from "tabletop/core";
import type { Letting, TableHandle } from "tabletop/react";
import {
	bysuitPose,
	cardOf,
	type DeckPose,
	FELT,
	fanPose,
	freshDeck,
	pokerPose,
	poseOf,
	putDown,
	sideOf,
	stackPose,
	type TrickDeck,
	turnOver,
	withTrick,
} from "./deck";

type Made = { readonly trick: Trick; readonly pose: DeckPose };

const index = (id: string) => cardOf(id).i;

function remPx(): number {
	return (
		Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		) || 16
	);
}

/** Where `id` shows now, as its centre in rem from the felt's centre. */
function centreOnFelt(table: TableHandle, id: string) {
	const box = table.shown(id);
	const felt = document
		.querySelector(`[data-tabletop-region="${FELT}"]`)
		?.getBoundingClientRect();
	if (!box || !felt) return null;
	const rem = remPx();
	return {
		u: (box.x + box.width / 2 - (felt.left + felt.width / 2)) / rem,
		v: (box.y + box.height / 2 - (felt.top + felt.height / 2)) / rem,
	};
}

function deckActions(
	table: TableHandle,
	setDeck: (next: (deck: TrickDeck) => TrickDeck) => void,
	latest: { readonly current: TrickDeck },
) {
	/* each trick is made when its turn comes, from the Deck as it is then */
	const queue = (make: (deck: TrickDeck) => Made) =>
		table.queue(() => {
			const { trick, pose } = make(latest.current);
			return {
				trick,
				commit: () => setDeck((deck) => withTrick(deck, trick, pose)),
			};
		});
	const intro = (deck: TrickDeck): Made => ({
		trick: deal(deck.order, stackPose, { faceDown: true }),
		pose: "stack",
	});
	const sorted =
		(reverse: boolean) =>
		(deck: TrickDeck): Made => ({
			trick: sort(deck.order, stackPose, { rank: index, reverse }),
			pose: "stack",
		});
	return {
		intro: () => queue(intro),
		flip: () =>
			queue((deck) => ({
				trick: flip(deck.order, poseOf(deck.pose), {
					sideOf: sideOf(deck),
				}),
				pose: deck.pose,
			})),
		shuffle: () =>
			queue((deck) => ({
				trick: shuffle(deck.order, stackPose),
				pose: "stack",
			})),
		sort: (reverse = false) => queue(sorted(reverse)),
		bysuit: () =>
			queue((deck) => ({
				trick: bysuit(deck.order, bysuitPose, { index }),
				pose: "bysuit",
			})),
		fan: () =>
			queue((deck) => ({
				trick: fanOut(deck.order, fanPose),
				pose: "fan",
			})),
		poker: () =>
			queue((deck) => ({
				trick: poker(deck.order, pokerPose),
				pose: "poker",
			})),
		turnDown: () =>
			queue((deck) => ({
				trick: turnDown(deck.order, poseOf(deck.pose)),
				pose: deck.pose,
			})),
		/** A tap turns the Card over, as the library's short press does. */
		turn: (id: string) =>
			table.transact(() => setDeck((deck) => turnOver(deck, id))),
		/** The hand let go: the Card rests where it is, over every other. */
		putDown: ({ id, velocity }: Letting) => {
			const centre = centreOnFelt(table, id);
			table.release(
				id,
				velocity,
				centre
					? () => setDeck((deck) => putDown(deck, id, centre))
					: undefined,
			);
		},
		/** The library's opening, on a fresh Deck: the intro and a sort. */
		open: () => {
			void table.queue(() => ({ trick: intro(latest.current).trick }));
			void queue(sorted(false));
		},
	};
}

export type DeckActions = ReturnType<typeof deckActions>;

/**
 * deck-of-cards' Deck on the Table: the entry's model and everything that
 * changes it. Each trick queues behind the one before, as the library's
 * queue runs them; a tap or a drop commits at once. The actions keep their
 * identity across renders.
 */
export function useDeckTricks(table: TableHandle) {
	const [deck, setDeck] = useState(freshDeck);
	const latest = useRef(deck);
	latest.current = deck;
	const [actions] = useState(() => deckActions(table, setDeck, latest));
	/* a fresh Deck on every mount deals itself in, as the library's page
	   does; a remount drops what the last one queued */
	useLayoutEffect(() => {
		actions.open();
		return () => table.drop();
	}, [table, actions]);
	return { deck, actions };
}
