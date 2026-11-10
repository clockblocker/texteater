import { Button } from "lego";
import { memo, useMemo } from "react";
import type { Place } from "tabletop/core";
import { Body, Shell } from "tabletop/react";
import { RestingControls } from "@/workspace/compass/resting-controls";
import { type CardParts, cardParts } from "./card-content";
import type { Role } from "./deck-plan";
import type { SessionPhase } from "./session";
import { type Story, storyWords } from "./stories";

const FACE =
	"rounded-[0.9rem] border border-line-strong shadow-[0_0.3rem_0.9rem_#0003]";

/** As the Compass sets a Card's title: one line, the caption truncating. */
const ONE_LINE_TITLE =
	"[&_[data-slot=note-title-row]]:flex-nowrap [&_[data-slot=note-title]]:min-w-0 [&_[data-slot=note-title]]:truncate";

/**
 * A Card's face: its Heading row, all a Card behind the front one shows,
 * and its other Blocks under it. A Card behind keeps its Blocks unseen: no
 * Card in front ever uncovers them at rest, and one turning over or still
 * fading in would flash them. `natural` lays the face out as tall as its
 * Blocks are, for measuring; otherwise it fills its Card, which clips it.
 */
export function CardFront({
	parts,
	behind = false,
	natural = false,
}: {
	readonly parts: CardParts;
	readonly behind?: boolean;
	readonly natural?: boolean;
}) {
	return (
		<div
			className={`flex flex-col bg-paper text-ink ${natural ? "" : "h-full"}`}
		>
			<RestingControls
				resting
				className={`flex h-12 shrink-0 items-end gap-4 px-4 pb-3.5 ${ONE_LINE_TITLE}`}
			>
				<div data-card-heading="" className="flex min-w-0 flex-1">
					{parts.heading}
				</div>
			</RestingControls>
			<div
				data-card-blocks=""
				className={`${natural ? "" : "min-h-0 flex-1 overflow-hidden"} ${behind ? "invisible" : ""}`}
			>
				<RestingControls resting>{parts.body}</RestingControls>
			</div>
		</div>
	);
}

/**
 * A Card's back: the clicked words while its Session runs (#1316), and,
 * when it failed and stays face down, why, with its Retry.
 */
function CardBack({
	words,
	failed,
	onRetry,
}: {
	readonly words: string;
	readonly failed: boolean;
	readonly onRetry: () => void;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 bg-canvas px-4 text-center">
			{/* the word wears the sheen the text's word does while it resolves */}
			<span
				data-card-word=""
				className={`font-semibold text-lg ${failed ? "text-ink-muted" : "word-sheen bg-ink-soft bg-clip-text text-transparent"}`}
			>
				<bdi>{words}</bdi>
			</span>
			{failed ? (
				<>
					<p className="text-sm text-destructive" role="alert">
						Could not be resolved.
					</p>
					<Button type="button" size="sm" onClick={onRetry}>
						Retry
					</Button>
				</>
			) : null}
		</div>
	);
}

function samePlace(a: Place, b: Place): boolean {
	return a.slot === b.slot && a.z === b.z && a.side === b.side;
}

type DeckCardProps = {
	readonly id: string;
	readonly place: Place;
	readonly story: Story;
	readonly role: Role;
	/** What the Session knows: what the face shows. */
	readonly phase: SessionPhase;
	readonly requestId: string;
	readonly clicked: number;
	/** How long after its face shows its Blocks start to arrive, in ms; `null` holds them still. */
	readonly arriveAfter: number | null;
	readonly onRetry: () => void;
};

/**
 * One Card of a click's Deck as a Body: the same element from its deal to
 * its stored Note, its face from the app's own Note renderers. While its
 * Session runs and it lies face down it is busy.
 */
export const DeckCard = memo(
	function DeckCard({
		id,
		place,
		story,
		role,
		phase,
		requestId,
		clicked,
		arriveAfter,
		onRetry,
	}: DeckCardProps) {
		const failed = phase === "Failed";
		const down = place.side === "back";
		const faces = useMemo(
			() => ({
				front: (
					<CardFront
						behind={role !== "Reading"}
						parts={cardParts(
							story,
							role,
							phase,
							requestId,
							clicked,
						)}
					/>
				),
				back: (
					<CardBack
						words={storyWords(story)}
						failed={failed}
						onRetry={onRetry}
					/>
				),
			}),
			[story, role, phase, requestId, clicked, failed, onRetry],
		);
		return (
			<Body
				id={id}
				place={place}
				role="article"
				aria-label={
					down ? `${storyWords(story)}, resolving` : `${role} card`
				}
				aria-busy={(down && !failed) || undefined}
				data-deck-card={role}
				data-arriving={arriveAfter === null ? undefined : ""}
				style={
					arriveAfter === null
						? undefined
						: ({
								"--arrive-after": `${arriveAfter}ms`,
							} as React.CSSProperties)
				}
				className="rounded-[0.9rem]"
			>
				<Shell
					faceClassName={FACE}
					front={faces.front}
					back={faces.back}
				/>
			</Body>
		);
	},
	(before, after) =>
		before.id === after.id &&
		before.story === after.story &&
		before.role === after.role &&
		before.phase === after.phase &&
		before.requestId === after.requestId &&
		before.clicked === after.clicked &&
		before.arriveAfter === after.arriveAfter &&
		before.onRetry === after.onRetry &&
		samePlace(before.place, after.place),
);
