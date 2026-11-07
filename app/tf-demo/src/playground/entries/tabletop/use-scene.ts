import { useLayoutEffect, useRef, useState } from "react";
import {
	contains,
	deal,
	fanOut,
	type Point,
	project,
	shuffle,
	sort,
} from "tabletop/core";
import type { Letting, TableHandle } from "tabletop/react";
import {
	closeCovers,
	DEALT,
	forget,
	groundPose,
	initialScene,
	moveCard,
	openCard,
	placesOf,
	REGIONS,
	type RegionId,
	redeal,
	regionOf,
	type Scene,
	TRICK_SCALE,
	throwAway,
	turnAll,
	turnCard,
	uncover,
	withDeck,
} from "./scene";

/** A release this fast, headed past the scene's edge, throws the Card away. */
const THROW_SPEED = 800;
/** How far ahead a release reads the hand, as the workspace does. */
const THROW_PROJECTION_MS = 160;

function rectOf(selector: string): DOMRect | null {
	return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

function boxOf(rect: DOMRect) {
	return {
		x: rect.left,
		y: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

function regionAt(point: Point): RegionId | null {
	return (
		REGIONS.find((region) => {
			const rect = rectOf(`[data-tabletop-region="${region}"]`);
			return rect !== null && contains(boxOf(rect), point);
		}) ?? null
	);
}

/**
 * The scene's state and everything that changes it. Every change is a
 * commit through the Table, so each Card moves from where it showed.
 */
export function useScene(table: TableHandle) {
	const [scene, setScene] = useState(() => initialScene());
	const latest = useRef(scene);
	latest.current = scene;
	const commit = (next: (scene: Scene) => Scene) => () => setScene(next);

	/* the intro: the Deck drops into place as the entry opens */
	useLayoutEffect(() => {
		void table.play(
			deal(DEALT, (order) => groundPose(order, "pile", 260), {
				scale: TRICK_SCALE,
			}),
		);
	}, [table]);

	const pileOf = (order: readonly string[]) =>
		groundPose(order, "pile", latest.current.spread);

	const throwOut = (id: string, velocity: Point) => {
		const from = placesOf(latest.current).get(id);
		if (!from) return;
		const flight = table.leave(id, { velocity });
		table.transact(commit((current) => throwAway(current, id, from)));
		void flight.then(() =>
			table.transact(commit((current) => forget(current, id))),
		);
	};

	return {
		scene,
		open: (id: string) =>
			table.transact(commit((current) => openCard(current, id))),
		/** Closes every Cover; whether there was one. */
		close: () => {
			if (Object.keys(latest.current.open).length === 0) return false;
			table.transact(commit(closeCovers));
			return true;
		},
		turn: (id: string) =>
			table.transact(commit((current) => turnCard(current, id))),
		turnAll: () => table.transact(commit(turnAll)),
		/** The hand let go of `id`; a flick turns it over as it lands. */
		release: ({ id, point, velocity }: Letting, flick = false) => {
			const current = latest.current;
			const bounds = rectOf("[data-tabletop-scene]");
			const ahead = project(point, velocity, THROW_PROJECTION_MS);
			const speed = Math.hypot(velocity.x, velocity.y);
			if (
				bounds &&
				speed > THROW_SPEED &&
				!contains(boxOf(bounds), ahead)
			) {
				throwOut(id, velocity);
				return;
			}
			const from = regionOf(current, id);
			const to = regionAt(point);
			table.release(
				id,
				velocity,
				commit((next) => {
					if (to && to !== from) return moveCard(next, id, to);
					const home = uncover(next, id);
					return flick ? turnCard(home, id) : home;
				}),
			);
		},
		deal: () =>
			table.play(
				deal(DEALT, pileOf, { scale: TRICK_SCALE }),
				commit(redeal),
			),
		fan: () => {
			const { cards, spread } = latest.current;
			const trick = fanOut(cards.ground, (order) =>
				groundPose(order, "fan", spread),
			);
			return table.play(
				trick,
				commit((next) => withDeck(next, trick.order, "fan")),
			);
		},
		shuffle: () => {
			const trick = shuffle(latest.current.cards.ground, pileOf, {
				scale: TRICK_SCALE,
			});
			return table.play(
				trick,
				commit((next) => withDeck(next, trick.order, "pile")),
			);
		},
		sort: () => {
			const trick = sort(latest.current.cards.ground, pileOf, {
				rank: (id) => DEALT.indexOf(id),
				reverse: true,
				scale: TRICK_SCALE,
				gather: { u: 0, v: 0 },
			});
			return table.play(
				trick,
				commit((next) => withDeck(next, trick.order, "pile")),
			);
		},
		setSpread: (spread: number) =>
			table.transact(commit((current) => ({ ...current, spread }))),
	};
}

export type SceneActions = ReturnType<typeof useScene>;
