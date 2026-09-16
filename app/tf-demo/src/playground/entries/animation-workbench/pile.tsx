import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { DummyNote } from "../deck-models/dummy";
import {
	type CardFrame,
	type Frame,
	HEADER_REM,
	type Layout,
	PILE_REM,
} from "./motion";

/**
 * Draws one Frame. No Motion, no CSS transitions: every style is the number
 * the variant computed for this instant, so what you see at a scrubbed `t`
 * is exactly what playback shows when it passes `t`.
 */

const CARD_CLASS =
	"absolute inset-x-0 flex cursor-pointer select-none flex-col overflow-hidden rounded-[0.9rem] outline-none focus-visible:ring-2 focus-visible:ring-link";

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

function shadow(lift: number): string {
	if (lift <= 0) return "none";
	const a = (0.65 * lift).toFixed(3);
	return `0 ${(18 * lift).toFixed(1)}px ${(36 * lift).toFixed(1)}px -10px rgba(0,0,0,${a})`;
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
	const chrome = frame.chrome > 0.5;
	return (
		<article
			aria-label={`${note.kind} card`}
			data-card={index}
			{...pressProps(index, tap)}
			className={`${CARD_CLASS} ${chrome ? "border border-line-strong bg-paper" : "border border-transparent bg-transparent"}`}
			style={{
				top: 0,
				height: frame.height,
				zIndex: frame.z,
				opacity: frame.opacity,
				transform: `translateY(${frame.y.toFixed(2)}px) scale(${frame.scale.toFixed(4)})`,
				boxShadow: shadow(frame.lift),
			}}
		>
			{below ? null : <Header note={note} />}
			{frame.bodyRotate !== 0 || frame.bodyOpacity !== 1 ? (
				<div
					className="flex min-h-0 flex-1 flex-col bg-paper"
					style={{
						transformOrigin: "50% 0%",
						transform: `perspective(900px) rotateX(${frame.bodyRotate.toFixed(2)}deg)`,
						backfaceVisibility: "hidden",
						opacity: frame.bodyOpacity,
					}}
				>
					<Body note={note} />
				</div>
			) : (
				<Body note={note} below={below} />
			)}
			{below ? <Header note={note} /> : null}
		</article>
	);
}

export function Pile({
	cards,
	frame,
	layout,
	tap,
}: {
	cards: readonly DummyNote[];
	frame: Frame;
	layout: Layout;
	tap: (index: number) => void;
}) {
	const panel = frame.panel;
	return (
		<div className="relative w-full" style={{ height: rem(PILE_REM) }}>
			{panel ? (
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper"
					style={{
						height: panel.height,
						transform: `translateY(${panel.y.toFixed(2)}px)`,
					}}
				>
					<div
						className="absolute inset-x-0 bottom-0"
						style={{ top: layout.header }}
					>
						{panel.texts.map((text) => {
							const note = cards[text.index];
							if (!note) return null;
							return (
								<div
									key={note.id}
									className="absolute inset-0 flex flex-col"
									style={{
										opacity: text.opacity,
										transform: `translateY(${text.y.toFixed(2)}px)`,
									}}
								>
									<Body note={note} />
								</div>
							);
						})}
					</div>
				</div>
			) : null}
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
