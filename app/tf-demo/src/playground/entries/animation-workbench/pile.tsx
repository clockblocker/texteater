import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cleanWord, type DummyNote } from "../deck-models/dummy";
import { type CardFrame, type Frame, HEADER_REM, PILE_REM } from "./motion";

/**
 * Draws one Frame. No Motion, no CSS transitions: every style is the number
 * the variant computed for this instant, so what you see at a scrubbed `t`
 * is exactly what playback shows when it passes `t`.
 *
 * A Card is the Compass Note in Card form (ADR 0006): the Heading Block,
 * then Source Contexts (two), the Body and the Links, clipped by the box
 * under a fade. A Card covered from below keeps the same Blocks and its
 * Heading sits at the bottom edge, offset by `headerY` while it travels.
 */

const CARD_CLASS =
	"absolute inset-x-0 flex cursor-pointer select-none flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper outline-none focus-visible:ring-2 focus-visible:ring-link";

const CARD_CONTEXTS = 2;

function rem(value: number): string {
	return `${value.toString()}rem`;
}

function Heading({
	note,
	atBottom,
	y,
}: {
	note: DummyNote;
	atBottom: boolean;
	y: number;
}) {
	return (
		<div
			data-heading
			className={`relative flex w-full shrink-0 items-end gap-4 bg-paper px-4 ${atBottom ? "" : "pb-2"}`}
			style={{
				height: rem(HEADER_REM),
				order: atBottom ? 2 : 0,
				transform: `translateY(${y.toFixed(2)}px)`,
			}}
		>
			<span
				className={`min-w-0 flex-1 truncate font-serif text-[1rem] leading-tight text-ink ${atBottom ? "pb-3" : ""}`}
			>
				{note.tail.form}
			</span>
			<span
				className={`shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted ${atBottom ? "pb-3" : ""}`}
			>
				{note.tail.gloss}
			</span>
		</div>
	);
}

function Blocks({ note, below }: { note: DummyNote; below: boolean }) {
	const word = cleanWord(note.word);
	return (
		<div className="relative order-1 min-h-0 flex-1 overflow-hidden">
			<div
				className={`flex flex-col gap-3 px-4 ${below ? "pt-3" : "pb-4"}`}
			>
				<div data-block="contexts" className="flex flex-col gap-1">
					<div className="flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						<span>Source contexts</span>
						<span>{note.contexts.length.toString()}</span>
					</div>
					<ul className="flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
						{note.contexts.slice(0, CARD_CONTEXTS).map((line) => (
							<li key={line}>{highlight(line, word)}</li>
						))}
					</ul>
				</div>
				<div
					data-block="body"
					className="space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft"
				>
					{note.lines.map((line, index) => (
						<p key={`${index.toString()}-${line}`}>{line}</p>
					))}
				</div>
				<ul
					data-block="links"
					className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-link"
				>
					{note.links.map((link) => (
						<li key={link.label}>
							{link.kind === "Text"
								? `↩ ${link.label} (${cleanWord(link.word)})`
								: link.label}
						</li>
					))}
				</ul>
			</div>
			{below ? null : (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent"
				/>
			)}
		</div>
	);
}

function highlight(line: string, word: string) {
	const index = line.toLowerCase().indexOf(word.toLowerCase());
	if (index < 0) return line;
	return (
		<>
			{line.slice(0, index)}
			<span className="text-ink">
				{line.slice(index, index + word.length)}
			</span>
			{line.slice(index + word.length)}
		</>
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
			<Heading note={note} atBottom={below} y={frame.headerY} />
			<Blocks note={note} below={below} />
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
