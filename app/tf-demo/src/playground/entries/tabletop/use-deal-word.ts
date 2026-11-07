import { useEffect, useRef, useState } from "react";
import { DECK_OF_CARDS } from "tabletop/core";
import type { TableHandle } from "tabletop/react";
import { dealWord, landWord, type Scene } from "./scene";
import { WORDS_TO_DEAL } from "./words";

/** How a dealt word's Knowledge arrives, and how the deal waits for it. */
export type DealFeel = {
	/** The fake Knowledge latency. */
	readonly latencyMs: number;
	/** Below this wait the Card is dealt face up, with no turn. */
	readonly thresholdMs: number;
	/**
	 * Whether a slow answer deals only once the threshold has passed, as a
	 * real click must (it can't know its latency), or at once, as this
	 * prototype can.
	 */
	readonly wait: boolean;
};

/** #1316's defaults: 1.2 s of Knowledge latency, a 300 ms threshold. */
export const DEFAULT_DEAL: DealFeel = {
	latencyMs: 1200,
	thresholdMs: 300,
	wait: false,
};

/** The deal: in from above the Pane, fading in, on deck-of-cards' tween. */
const DEAL_MOVE = {
	source: "app",
	tween: DECK_OF_CARDS.move,
	from: { y: -96, opacity: -1 },
} as const;

/**
 * "Deal a word" (#1316): a new Card is dealt into the Pane face down with
 * the clicked word on its back, busy, and turns face up once its fake
 * Knowledge lands, never before its deal has landed. An answer faster than
 * the threshold deals it face up, with no turn. Each landing is announced.
 */
export function useDealWord(
	table: TableHandle,
	setScene: (next: (scene: Scene) => Scene) => void,
) {
	const [announcement, setAnnouncement] = useState("");
	const dealt = useRef(0);
	const timers = useRef(new Set<number>());
	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending) window.clearTimeout(timer);
		};
	}, []);
	const later = (ms: number, run: () => void) => {
		if (ms <= 0) return run();
		const timer = window.setTimeout(() => {
			timers.current.delete(timer);
			run();
		}, ms);
		timers.current.add(timer);
	};

	const dealWordNow = ({ latencyMs, thresholdMs, wait }: DealFeel) => {
		const n = dealt.current++;
		const word = WORDS_TO_DEAL[n % WORDS_TO_DEAL.length];
		if (!word) return;
		const round = Math.floor(n / WORDS_TO_DEAL.length);
		const id = round === 0 ? word.card.id : `${word.card.id}-${round + 1}`;
		const card = { ...word.card, id };
		const fast = latencyMs < thresholdMs;
		const dealAt = fast ? latencyMs : wait ? thresholdMs : 0;
		const announce = () => setAnnouncement(`${card.title} is ready.`);
		later(dealAt, () => {
			table.transact(
				() =>
					setScene((scene) =>
						dealWord(
							scene,
							id,
							{ surface: word.surface, card },
							fast,
						),
					),
				new Map([[id, DEAL_MOVE]]),
			);
			if (fast) announce();
		});
		if (fast) return;
		/* a Card turns up no sooner than its deal has landed */
		later(Math.max(latencyMs, dealAt + DECK_OF_CARDS.move.ms), () => {
			table.transact(() => setScene((scene) => landWord(scene, id)));
			announce();
		});
	};

	return { announcement, dealWord: dealWordNow };
}
