import { useEffect, useRef, useState } from "react";
import { Inspector, InspectorSection } from "../inspector";
import { Deck } from "./deck";
import "./deck-of-cards.css";

const TITLE = "Deck of cards";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** The buttons of upstream's `example/example.js`, in its order. */
const ACTIONS: readonly (readonly [string, (deck: Deck) => void])[] = [
	["Flip", (deck) => deck.flip()],
	[
		"Shuffle",
		(deck) => {
			deck.shuffle();
			deck.shuffle();
		},
	],
	[
		"By suit",
		(deck) => {
			deck.sort(true); // sort reversed
			deck.bysuit();
		},
	],
	["Fan", (deck) => deck.fan()],
	[
		"Poker",
		(deck) => {
			deck.queue((next) => {
				deck.cards.forEach((card, i) => {
					setTimeout(() => {
						card.setSide("back");
					}, i * 7.5);
				});
				next();
			});
			deck.shuffle();
			deck.shuffle();
			deck.poker();
		},
	],
	["Sort", (deck) => deck.sort()],
];

/**
 * pakastin's deck-of-cards, github.com/deck-of-cards/deck-of-cards at commit
 * 54f2c4787ea51bb43656e51a3bbbd524f248e21b (2023-04-16), ported to
 * TypeScript in this folder and run as its example page runs it, on a felt
 * frame with the example's buttons in the inspector. The code is MIT; the
 * card art in `faces/` is Chris Aguilar's Vector Playing Cards, LGPL-3.0
 * (`LICENSE`). The example's easter eggs and toast messages are left out.
 */
export function DeckOfCards() {
	const containerRef = useRef<HTMLDivElement>(null);
	const deckRef = useRef<Deck | null>(null);
	const [jokers, setJokers] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const deck = Deck(jokers);
		for (const card of deck.cards) {
			card.enableDragging();
			card.enableFlipping();
		}
		deck.mount(container);
		deck.intro();
		deck.sort();
		deckRef.current = deck;
		return () => {
			deck.unmount();
			if (deckRef.current === deck) deckRef.current = null;
		};
	}, [jokers]);

	return (
		<>
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<div
					data-deck-of-cards=""
					className="relative min-h-[36rem] flex-1 overflow-hidden rounded-[0.7rem] border border-line"
				>
					<div
						ref={containerRef}
						className="absolute start-1/2 top-1/2"
					/>
				</div>
			</div>
			<Inspector title={TITLE}>
				<InspectorSection>
					<p className="text-ink-soft">
						pakastin's deck-of-cards as its example page runs it.
						Drag a card to move it; tap it to flip it.
					</p>
				</InspectorSection>
				<InspectorSection title="Deck">
					<div className="flex flex-wrap gap-1">
						{ACTIONS.map(([label, run]) => (
							<button
								key={label}
								type="button"
								className={button}
								onClick={() => {
									if (deckRef.current) run(deckRef.current);
								}}
							>
								{label}
							</button>
						))}
					</div>
					<label className="flex items-center justify-between gap-3 text-ink-soft">
						Jokers
						<input
							type="checkbox"
							checked={jokers}
							onChange={(event) =>
								setJokers(event.target.checked)
							}
						/>
					</label>
				</InspectorSection>
			</Inspector>
		</>
	);
}
