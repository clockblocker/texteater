import { BAR_REM } from "compass";
import { memo, useMemo } from "react";
import { DEFAULT_TURN, type TurnFeel } from "tabletop/core";
import { Region, Slot, Table, useTable } from "tabletop/react";
import { segmentKey } from "@/hooks/use-segment-selection";
import { useMotionPreference } from "@/lib/motion-preference";
import { ScrollPresentation } from "@/views/scroll-view";
import { cardParts } from "./card-content";
import type { SessionEvent } from "./fake-convex";
import type { Knobs } from "./knobs";
import { CardFront, DeckCard } from "./proposed-card";
import { bodyId, deckPlaces, deckSlots, PANE } from "./proposed-scene";
import { type StoryStatus, storyScrollView } from "./stored-notes";
import { sentenceId } from "./story-notes";
import { layoutOf, type Run, useProposedDeck } from "./use-proposed-deck";

/**
 * The front Card's Blocks arrive once the move that showed its face has
 * landed, 75 ms apart, each fading in over 220 ms and rising 8 px (#1311).
 * Reduced, they only fade. Slow-mo stretches them with the Table.
 */
const ARRIVE_CSS = `
@keyframes resolution-arrive{from{opacity:0;translate:0 8px}to{opacity:1;translate:0 0}}
@keyframes resolution-arrive-reduced{from{opacity:0}to{opacity:1}}
[data-arriving] [data-card-blocks] [data-note-presentation]>article>*{
animation:resolution-arrive calc(220ms * var(--slow,1)) cubic-bezier(0.215,0.61,0.355,1) both;
animation-delay:calc((var(--arrive-after,0ms) + var(--nth,0) * 75ms) * var(--slow,1))}
[data-reduced] [data-arriving] [data-card-blocks] [data-note-presentation]>article>*{animation-name:resolution-arrive-reduced;animation-duration:calc(140ms * var(--slow,1))}
${[1, 2, 3, 4, 5, 6, 7].map((nth) => `[data-arriving] [data-card-blocks] [data-note-presentation]>article>:nth-child(${nth + 1}){--nth:${nth}}`).join("\n")}`;

/* #1313's turn about the long axis: a Card dealt face down is landscape, so that is X */
const CARD_TURN: TurnFeel = { ...DEFAULT_TURN, axis: "x" };

function useReduced(choice: Knobs["reducedMotion"], alwaysPlay: boolean) {
	return useMemo(() => {
		if (choice !== "system") return choice === "on";
		return (
			!alwaysPlay &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		);
	}, [choice, alwaysPlay]);
}

/**
 * Proposed: the same text and the same Notes, on the tabletop battery,
 * with the map's decisions applied to the whole Deck. A click's Cards are
 * Bodies resting in CSS Slots; the fake Session's plan decides which is
 * dealt when, and the Table moves each from where it showed.
 */
export function ProposedStage({
	knobs,
	onState,
}: {
	readonly knobs: Knobs;
	readonly onState: (event: SessionEvent) => void;
}) {
	const table = useTable();
	const { preference } = useMotionPreference();
	const alwaysPlay = preference === "ignore";
	const reduced = useReduced(knobs.reducedMotion, alwaysPlay);
	const { scene, select, retry, measure } = useProposedDeck(
		table,
		knobs,
		reduced,
		onState,
	);
	const runs = useMemo(
		() => [...scene.leaving, ...(scene.run ? [scene.run] : [])],
		[scene.leaving, scene.run],
	);
	const slots = runs.flatMap((run) => {
		const layout = layoutOf(run);
		return layout ? deckSlots(layout) : [];
	});
	const lit = scene.run
		? segmentKey(sentenceId(scene.run.story.sentence), scene.run.clicked)
		: null;
	return (
		<Table
			table={table}
			dir={knobs.rtl ? "rtl" : "ltr"}
			reducedMotion={knobs.reducedMotion}
			alwaysPlay={alwaysPlay}
			timeScale={knobs.timeScale}
			turn={CARD_TURN}
			assert={import.meta.env.DEV}
			className="flex min-h-0 flex-1 flex-col"
			style={{ "--slow": 1 / knobs.timeScale } as React.CSSProperties}
		>
			<style>{ARRIVE_CSS}</style>
			{/* the text starts under the Pane bar's height, as the app's does */}
			<Region
				id={PANE}
				className="min-h-0 flex-1 overflow-hidden bg-paper"
				style={{ paddingTop: `${BAR_REM}rem` }}
			>
				<StoryText status={scene.status} lit={lit} onSelect={select} />
				{slots.map((spec) => (
					<Slot key={spec.id} spec={spec} />
				))}
				{scene.measuring ? (
					<div
						ref={measure}
						aria-hidden="true"
						inert
						className="pointer-events-none invisible absolute start-0 top-0 border border-transparent"
						style={{ width: "min(26rem, 100% - 2rem)" }}
					>
						<CardFront
							natural
							parts={cardParts(
								scene.measuring.run.story,
								"Reading",
								scene.measuring.state.phase,
								scene.measuring.run.id,
								scene.measuring.run.clicked,
							)}
						/>
					</div>
				) : null}
			</Region>
			{runs.map((run) => (
				<DeckCards key={run.id} run={run} onRetry={retry} />
			))}
			<p role="status" aria-live="polite" className="sr-only">
				{scene.announcement}
			</p>
		</Table>
	);
}

/** One Deck's Cards, each a Body; a Deck re-renders only when it changes. */
const DeckCards = memo(function DeckCards({
	run,
	onRetry,
}: {
	readonly run: Run;
	readonly onRetry: () => void;
}) {
	const layout = layoutOf(run);
	if (!layout || !run.shown) return null;
	const places = deckPlaces(layout);
	const { phase } = run.shown;
	return layout.cards.map((role) => {
		const id = bodyId(run.id, role);
		const place = places.get(id);
		return place ? (
			<DeckCard
				key={id}
				id={id}
				place={place}
				story={run.story}
				role={role}
				phase={phase}
				requestId={run.id}
				clicked={run.clicked}
				arriveAfter={role === "Reading" ? run.arriveAfter : null}
				onRetry={onRetry}
			/>
		) : null;
	});
});

/** The text, as the app's reader sets it: each word as its Session leaves it. */
const StoryText = memo(function StoryText({
	status,
	lit,
	onSelect,
}: {
	readonly status: ReadonlyMap<string, StoryStatus>;
	readonly lit: string | null;
	readonly onSelect: (sentenceId: string, clicked: number) => void;
}) {
	const sentences = useMemo(
		() => storyScrollView(({ key }) => status.get(key)).sentences,
		[status],
	);
	return (
		<ScrollPresentation
			sentences={sentences}
			selectedSegmentKey={lit}
			onSegmentClick={async (sentence, clicked) =>
				onSelect(sentence.sentenceId, clicked)
			}
		/>
	);
});
