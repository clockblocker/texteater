import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { DummyNote } from "../deck-models/dummy";
import { type CardFrame, type Frame, HEADER_REM, PILE_REM } from "./motion";

/**
 * Draws one Frame. No Motion, no CSS transitions: every style is the number
 * the variant computed for this instant, so what you see at a scrubbed `t`
 * is exactly what playback shows when it passes `t`.
 */

const CARD_CLASS =
	"absolute inset-x-0 flex cursor-pointer select-none flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper outline-none focus-visible:ring-2 focus-visible:ring-link";

function rem(value: number): string {
	return `${value.toString()}rem`;
}

export function Header({ note }: { note: DummyNote }) {
	return (
		<span
			className="flex w-full shrink-0 items-center justify-between gap-4 px-4"
			style={{ height: rem(HEADER_REM) }}
		>
			<span className="truncate font-serif text-[1rem] text-ink">
				{note.tail.form}
			</span>
			<span className="shrink-0 text-[0.72rem] text-ink-muted">
				{note.tail.gloss}
			</span>
		</span>
	);
}

export function Body({
	note,
	below = false,
}: {
	note: DummyNote;
	below?: boolean;
}) {
	return (
		<div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
			<div
				className={`space-y-1.5 px-4 text-[0.85rem] leading-relaxed text-ink-soft ${below ? "pt-3" : "pb-3"}`}
			>
				{note.lines.map((line, index) => (
					<p key={`${index.toString()}-${line}`}>{line}</p>
				))}
			</div>
			{below ? null : (
				<div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent" />
			)}
		</div>
	);
}

function pressProps(index: number, tap: (index: number) => void) {
	return {
		role: "button" as const,
		tabIndex: 0,
		onClick: () => tap(index),
		onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				tap(index);
			}
		},
	};
}

function Card({
	note,
	index,
	frame,
	tap,
}: {
	note: DummyNote;
	index: number;
	frame: CardFrame;
	tap: (index: number) => void;
}) {
	const below = frame.headerAt === "bottom";
	return (
		<article
			aria-label={`${note.kind} card`}
			data-card={index}
			{...pressProps(index, tap)}
			className={CARD_CLASS}
			style={{
				top: 0,
				height: frame.height,
				zIndex: frame.z,
				transform: `translateY(${frame.y.toFixed(2)}px) scale(${frame.scale.toFixed(4)})`,
			}}
		>
			{below ? null : <Header note={note} />}
			<Body note={note} below={below} />
			{below ? <Header note={note} /> : null}
		</article>
	);
}

export function Pile({
	cards,
	frame,
	tap,
}: {
	cards: readonly DummyNote[];
	frame: Frame;
	tap: (index: number) => void;
}) {
	return (
		<div className="relative w-full" style={{ height: rem(PILE_REM) }}>
			{cards.map((note, index) => {
				const card = frame.cards[index];
				if (!card) return null;
				return (
					<Card
						key={note.id}
						note={note}
						index={index}
						frame={card}
						tap={tap}
					/>
				);
			})}
		</div>
	);
}
