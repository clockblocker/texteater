import { cn } from "lego";
import { Fragment, useLayoutEffect, useMemo, useState } from "react";
import { langAttrs } from "@/fixtures";
import { type Column, type GlossCase, type LemmaPiece, unitOf } from "./cases";
import {
	columnKey,
	type GlossStyle,
	type Link,
	type Lit,
	lemmaKey,
	linksOf,
	litBy,
} from "./focus";
import { GlossText } from "./gloss-text";

/** The design's open choices, the inspector's knobs. */
export type GlossKnobs = {
	readonly style: GlossStyle;
	readonly morphRow: boolean;
	readonly lines: boolean;
};

type FocusHandlers = {
	/** A tap or click: the word keeps the focus. */
	readonly onFocus: (key: string) => void;
	/** A mouse resting on a word lends it the focus; `null` when it leaves. */
	readonly onHover: (key: string | null) => void;
};

/**
 * How wide a word's column may grow. Spelled-out glosses run long, so
 * their columns stay narrow and the gloss breaks after its hyphens,
 * periods and slashes, keeping the words on one row.
 */
export const columnWidth = (style: GlossStyle) =>
	style === "spelled" ? "max-w-[4.25rem]" : "max-w-[12rem]";

export const toneClass = (glossCase: GlossCase) =>
	glossCase.lemma.tone === "neuter" ? "[--link:var(--gender-neuter)]" : "";

/**
 * The clicked words as an interlinear gloss after the Leipzig Glossing
 * Rules: each word over its morphemes, hyphenated (rule 2), over their
 * glosses, left-aligned word by word (rule 1). Under them the lemma's
 * header, glossed the same way, and its free translation in single
 * quotes. A line runs from each piece that goes into the lemma to where
 * it lands, so the change of order shows as lines that cross. The focused
 * word, its pieces, its lines and where they land take the link colour.
 */
export function Alignment({
	glossCase,
	knobs,
	focus,
	size,
	...handlers
}: FocusHandlers & {
	readonly glossCase: GlossCase;
	readonly knobs: GlossKnobs;
	readonly focus: string | null;
	readonly size: "card" | "sheet";
}) {
	const [figure, setFigure] = useState<HTMLElement | null>(null);
	const links = useMemo(() => linksOf(glossCase), [glossCase]);
	const source =
		knobs.style !== "plain" ? "gloss" : knobs.morphRow ? "morph" : "word";
	const paths = useLinkPaths(figure, links, source);
	const lit = litBy(glossCase, focus);
	// Room for the lines to cross; a lone line needs less.
	const band = !knobs.lines
		? 14
		: (size === "sheet" ? 12 : 0) + (links.length > 1 ? 64 : 40);
	const ordered = [...paths].sort(
		(a, b) => Number(lit.links.has(a.key)) - Number(lit.links.has(b.key)),
	);

	return (
		<figure
			ref={setFigure}
			{...langAttrs("de")}
			className={cn(
				"relative m-0 grid w-fit max-w-full",
				toneClass(glossCase),
			)}
		>
			<div
				className={cn(
					"flex flex-wrap items-start gap-y-3",
					knobs.style === "spelled" ? "gap-x-3" : "gap-x-4",
				)}
			>
				{unitOf(glossCase).map((column) => (
					<ColumnStack
						key={column.id}
						column={column}
						knobs={knobs}
						lit={lit}
						size={size}
						{...handlers}
					/>
				))}
			</div>
			<div aria-hidden="true" style={{ height: band }} />
			<div className="flex flex-wrap items-start justify-between gap-x-3.5 gap-y-2">
				{glossCase.lemma.pieces.map((piece) => (
					<LemmaStack
						key={piece.id}
						piece={piece}
						knobs={knobs}
						lit={lit.lemma.has(piece.id)}
						size={size}
						{...handlers}
					/>
				))}
			</div>
			<p
				{...langAttrs("en")}
				className={cn(
					"mt-1.5 text-ink-soft",
					size === "sheet" ? "text-sm" : "text-[0.8125rem]",
				)}
			>
				‘{glossCase.lemma.translation}’
			</p>
			{knobs.lines ? (
				<svg
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full overflow-visible"
				>
					{ordered.map((path) => {
						const on = lit.links.has(path.key);
						return (
							<path
								key={path.key}
								d={path.d}
								fill="none"
								strokeLinecap="round"
								style={{
									stroke: on
										? "var(--link)"
										: "var(--line-strong)",
									strokeWidth: on ? 1.75 : 1.1,
									opacity: on ? 1 : 0.8,
								}}
							/>
						);
					})}
				</svg>
			) : null}
		</figure>
	);
}

/** One clicked word: the word, its morphemes and their glosses. */
function ColumnStack({
	column,
	knobs,
	lit,
	size,
	onFocus,
	onHover,
}: FocusHandlers & {
	readonly column: Column;
	readonly knobs: GlossKnobs;
	readonly lit: Lit;
	readonly size: "card" | "sheet";
}) {
	const on = lit.columns.has(column.id);
	const key = columnKey(column.id);
	const goes = (index: number) =>
		on && (column.pieces[index]?.to?.length ?? 0) > 0;
	return (
		<button
			type="button"
			data-ig-col={column.id}
			aria-pressed={on}
			onClick={() => onFocus(key)}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") onHover(key);
			}}
			onPointerLeave={() => onHover(null)}
			className={cn(
				"grid cursor-pointer justify-items-start gap-0.5 rounded-sm text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-link",
				columnWidth(knobs.style),
				size === "sheet" ? "text-[0.9375rem]" : "text-sm",
			)}
		>
			<span
				data-ig-word={column.id}
				className={cn(
					"leading-snug font-[570] tracking-[-0.02em]",
					size === "sheet" ? "text-xl" : "text-lg",
					on ? "text-link" : "text-ink",
				)}
			>
				{column.word}
			</span>
			{knobs.morphRow ? (
				<span className="text-ink-soft italic">
					{column.pieces.map((piece, index) => (
						<Fragment key={`${index}:${piece.morph}`}>
							{index > 0 ? "-" : null}
							<span
								data-ig-morph={`${column.id}:${index}`}
								className={cn(
									goes(index)
										? "text-link"
										: piece.morph === column.word &&
												"text-ink-faint",
								)}
							>
								{piece.morph}
							</span>
						</Fragment>
					))}
				</span>
			) : null}
			{knobs.style === "plain" ? (
				<span {...langAttrs("en")} className="text-ink-muted">
					{column.plain}
				</span>
			) : (
				<span className="text-ink-muted [overflow-wrap:anywhere]">
					{column.pieces.map((piece, index) => (
						<Fragment key={`${index}:${piece.leipzig}`}>
							{index > 0 ? (
								<>
									-<wbr />
								</>
							) : null}
							<span
								data-ig-gloss={`${column.id}:${index}`}
								className={cn(goes(index) && "text-link")}
							>
								<GlossText
									gloss={
										knobs.style === "leipzig"
											? piece.leipzig
											: piece.spelled
									}
								/>
							</span>
						</Fragment>
					))}
				</span>
			)}
		</button>
	);
}

/** One word of the lemma's header, over its gloss. */
function LemmaStack({
	piece,
	knobs,
	lit,
	size,
	onFocus,
	onHover,
}: FocusHandlers & {
	readonly piece: LemmaPiece;
	readonly knobs: GlossKnobs;
	readonly lit: boolean;
	readonly size: "card" | "sheet";
}) {
	const key = lemmaKey(piece.id);
	return (
		<button
			type="button"
			aria-pressed={lit}
			onClick={() => onFocus(key)}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") onHover(key);
			}}
			onPointerLeave={() => onHover(null)}
			className={cn(
				"grid cursor-pointer justify-items-start gap-0.5 rounded-sm text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-link",
				columnWidth(knobs.style),
				size === "sheet" ? "text-sm" : "text-[0.8125rem]",
			)}
		>
			<span
				data-ig-lemma={piece.id}
				className={cn(
					"leading-snug tracking-[-0.02em]",
					size === "sheet" ? "text-lg" : "text-base",
					piece.slot ? "font-normal italic" : "font-[570]",
					lit
						? "text-link"
						: piece.quiet
							? "text-ink-faint"
							: piece.slot
								? "text-ink-soft"
								: "text-ink",
				)}
			>
				{piece.text}
			</span>
			<span className="text-ink-muted">
				{knobs.style === "plain" ? (
					<span {...langAttrs("en")}>{piece.plain}</span>
				) : (
					<GlossText
						gloss={
							knobs.style === "leipzig"
								? piece.leipzig
								: piece.spelled
						}
					/>
				)}
			</span>
		</button>
	);
}

type Path = { readonly key: string; readonly d: string };

/**
 * Each line's curve, from under the piece's column to the top of the
 * lemma word it lands on, in the figure's own px. It measures again when
 * anything in the figure resizes or the fonts arrive, and divides out any
 * scale the figure is animating through.
 */
function useLinkPaths(
	figure: HTMLElement | null,
	links: readonly Link[],
	source: "gloss" | "morph" | "word",
): readonly Path[] {
	const [paths, setPaths] = useState<readonly Path[]>([]);
	useLayoutEffect(() => {
		if (!figure) return;
		const measure = () => {
			const origin = figure.getBoundingClientRect();
			const scale = figure.offsetWidth
				? origin.width / figure.offsetWidth
				: 1;
			const at = (x: number, y: number) =>
				`${round((x - origin.left) / scale)} ${round((y - origin.top) / scale)}`;
			const next = links.flatMap((link) => {
				const column = figure.querySelector(
					`[data-ig-col="${link.column}"]`,
				);
				const from = figure.querySelector(
					source === "word"
						? `[data-ig-word="${link.column}"]`
						: `[data-ig-${source}="${link.column}:${link.index}"]`,
				);
				const to = figure.querySelector(`[data-ig-lemma="${link.to}"]`);
				if (!column || !from || !to) return [];
				const piece = from.getBoundingClientRect();
				const target = to.getBoundingClientRect();
				const x1 = piece.left + piece.width / 2;
				const y1 = column.getBoundingClientRect().bottom + 4 * scale;
				const x2 = target.left + target.width / 2;
				const y2 = target.top - 3 * scale;
				const bend = (y2 - y1) * 0.6;
				return [
					{
						key: link.key,
						d: `M ${at(x1, y1)} C ${at(x1, y1 + bend)} ${at(x2, y2 - bend)} ${at(x2, y2)}`,
					},
				];
			});
			setPaths((previous) =>
				previous.length === next.length &&
				previous.every((path, index) => path.d === next[index]?.d)
					? previous
					: next,
			);
		};
		measure();
		const observer = new ResizeObserver(() => measure());
		observer.observe(figure);
		for (const child of figure.querySelectorAll(
			"[data-ig-col], [data-ig-lemma]",
		))
			observer.observe(child);
		void document.fonts?.ready.then(measure);
		// A popover that scales in settles after its first frames.
		const settle = window.setTimeout(measure, 260);
		return () => {
			observer.disconnect();
			window.clearTimeout(settle);
		};
	}, [figure, links, source]);
	return paths;
}

const round = (value: number) => Math.round(value * 10) / 10;
