import { cn, LinkButton } from "lego";
import { ArrowRight } from "lucide-react";
import {
	Fragment,
	type ReactNode,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { langAttrs } from "@/fixtures";
import {
	columnKey,
	type GlossStyle,
	type Link,
	type Lit,
	linksOf,
	litBy,
	targetKey,
} from "./focus";
import { GlossText } from "./gloss-text";
import { SlottedLine, tokenClass } from "./line";
import type { Column, Step } from "./model";

/** The design's open choices, the inspector's knobs. */
export type GlossKnobs = {
	readonly style: GlossStyle;
	readonly morphRow: boolean;
	readonly lines: boolean;
};

export type FocusHandlers = {
	/** A tap or click: the token keeps the focus. */
	readonly onFocus: (key: string) => void;
	/** A mouse resting on a token lends it the focus; `null` when it leaves. */
	readonly onHover: (key: string | null) => void;
};

/** The line a gloss lands on, which is also the link to the next Card. */
export type Landing = {
	readonly onFollow: () => void;
	readonly tone?: "neuter";
	/** Printed after the link: the Lemma's family and kind. */
	readonly aside?: ReactNode;
};

/**
 * How wide a word's column may grow. A column starts at its narrowest,
 * the gloss broken after its hyphens and periods, and grows back to one
 * line where the row has room, so a row narrows before it wraps.
 * Spelled-out glosses run long, so their columns stay narrow.
 */
const columnWidth = (style: GlossStyle) =>
	cn(
		"grow basis-[min-content]",
		style === "spelled" ? "max-w-[4.25rem]" : "max-w-fit",
	);

export const toneClass = (tone: "neuter" | undefined) =>
	tone === "neuter" ? "[--link:var(--gender-neuter)]" : "";

/**
 * One step as an interlinear gloss after the Leipzig Glossing Rules: each
 * word over its morphemes, hyphenated (rule 2), over their glosses,
 * left-aligned word by word (rule 1). Under them the line the step lands
 * on, which is the link to the next Card. A line runs from each piece
 * that goes on to where it lands, so a change of order shows as lines
 * that cross; a word that leaves the line gets a dashed stub. The focused
 * token, its lines and where they land take the link colour.
 */
export function Alignment({
	step,
	knobs,
	focus,
	size,
	landing,
	...handlers
}: FocusHandlers & {
	readonly step: Step;
	readonly knobs: GlossKnobs;
	readonly focus: string | null;
	readonly size: "card" | "sheet";
	readonly landing: Landing;
}) {
	const [figure, setFigure] = useState<HTMLElement | null>(null);
	const links = useMemo(() => linksOf(step), [step]);
	const source =
		knobs.style !== "plain" ? "gloss" : knobs.morphRow ? "morph" : "word";
	const paths = useLinkPaths(figure, step, links, source);
	const lit = litBy(step, focus);
	// Room for the lines to cross; lines that keep their order need less.
	const order = links.map((link) =>
		step.targets.findIndex((target) => target.id === link.to),
	);
	const crossing = order.some(
		(at, index) => at < Math.max(-1, ...order.slice(0, index)),
	);
	const band = !knobs.lines
		? 10
		: (size === "sheet" ? 12 : 0) + (crossing ? 64 : 36);
	const ordered = [...paths].sort(
		(a, b) => Number(lit.links.has(a.key)) - Number(lit.links.has(b.key)),
	);

	return (
		<figure
			ref={setFigure}
			{...langAttrs("de")}
			className={cn(
				"relative m-0 grid w-fit max-w-full",
				toneClass(landing.tone),
			)}
		>
			<div
				className={cn(
					"flex flex-wrap items-start gap-y-3",
					knobs.style === "spelled" ? "gap-x-3" : "gap-x-4",
				)}
			>
				{step.columns.map((column) => (
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
			<p
				data-ig-landing=""
				className="grid justify-items-start gap-y-0.5"
			>
				<LinkButton
					tone={landing.tone ?? "link"}
					onClick={landing.onFollow}
					className={cn(
						"flex w-full font-[570] tracking-[-0.01em]",
						size === "sheet" ? "text-lg" : "text-base",
					)}
				>
					<ArrowRight
						aria-hidden="true"
						className="rtl:-scale-x-100"
					/>
					<span className="flex flex-1 flex-wrap justify-between gap-x-3">
						<SlottedLine
							tokens={step.targets}
							render={(token, text) => {
								const key = targetKey(token.id);
								const target = step.targets.find(
									(each) => each.id === token.id,
								);
								return (
									<span
										data-ig-to={token.id}
										onPointerEnter={(event) => {
											if (event.pointerType === "mouse")
												handlers.onHover(key);
										}}
										onPointerLeave={() =>
											handlers.onHover(null)
										}
										className={cn(
											"rounded-sm transition-colors",
											target?.quiet && "text-ink-faint",
											lit.targets.has(token.id) &&
												"bg-link/15 shadow-[0_0_0_2px_color-mix(in_oklab,var(--link)_15%,transparent)]",
										)}
									>
										{text}
									</span>
								);
							}}
						/>
					</span>
				</LinkButton>
				{landing.aside ? (
					<span
						{...langAttrs("en")}
						className="text-xs text-ink-muted"
					>
						{landing.aside}
					</span>
				) : null}
			</p>
			{knobs.lines ? (
				<svg
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full overflow-visible"
				>
					{ordered.map((path) => {
						const on = path.drop
							? lit.drops.has(path.drop)
							: lit.links.has(path.key);
						return (
							<path
								key={path.key}
								d={path.d}
								fill="none"
								strokeLinecap="round"
								strokeDasharray={path.drop ? "2 4" : undefined}
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

/** One word of the top row: the word, its morphemes and their glosses. */
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
				{/* The token's own style inside, so a slot's smaller mono
				    keeps the row's line box and the rows stay aligned. */}
				<span
					className={cn(tokenClass(column.style), on && "text-link")}
				>
					{column.word}
				</span>
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
				<span className="text-ink-muted">
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

type Path = {
	readonly key: string;
	readonly d: string;
	/** The column a dropping-out stub leaves from. */
	readonly drop?: string;
};

/**
 * Each line's curve, from under the piece's column to the top of the
 * token it lands on, and each dropping column's stub, in the figure's own
 * px. It measures again when anything in the figure resizes or the fonts
 * arrive, and divides out any scale the figure is animating through.
 */
function useLinkPaths(
	figure: HTMLElement | null,
	step: Step,
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
			const landing = figure.querySelector("[data-ig-landing]");
			const landingTop = landing?.getBoundingClientRect().top ?? 0;
			const lines = links.flatMap((link) => {
				const column = figure.querySelector(
					`[data-ig-col="${link.column}"]`,
				);
				const from = figure.querySelector(
					source === "word"
						? `[data-ig-word="${link.column}"]`
						: `[data-ig-${source}="${link.column}:${link.index}"]`,
				);
				const to = figure.querySelector(`[data-ig-to="${link.to}"]`);
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
			const stubs = step.columns.flatMap((each) => {
				if (!each.drops) return [];
				const column = figure.querySelector(
					`[data-ig-col="${each.id}"]`,
				);
				const word = figure.querySelector(
					`[data-ig-word="${each.id}"]`,
				);
				if (!column || !word || !landing) return [];
				const box = word.getBoundingClientRect();
				const mid = box.left + box.width / 2;
				const y1 = column.getBoundingClientRect().bottom + 4 * scale;
				const y2 = y1 + (landingTop - y1) * 0.45;
				return [
					{
						key: `drop:${each.id}`,
						drop: each.id,
						d: `M ${at(mid, y1)} L ${at(mid, y2)}`,
					},
				];
			});
			const next = [...lines, ...stubs];
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
			"[data-ig-col], [data-ig-landing]",
		))
			observer.observe(child);
		void document.fonts?.ready.then(measure);
		// A popover that scales in settles after its first frames.
		const settle = window.setTimeout(measure, 260);
		return () => {
			observer.disconnect();
			window.clearTimeout(settle);
		};
	}, [figure, step, links, source]);
	return paths;
}

const round = (value: number) => Math.round(value * 10) / 10;
