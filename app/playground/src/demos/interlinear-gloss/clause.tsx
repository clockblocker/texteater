import { cn } from "lego";
import { Fragment } from "react";
import { langAttrs } from "@/fixtures";
import { columnWidth, type GlossKnobs, toneClass } from "./alignment";
import type { Column, GlossCase } from "./cases";
import { columnKey, litBy } from "./focus";
import { GlossText } from "./gloss-text";

/**
 * The clause the clicked words stand in, glossed word by word as a
 * Leipzig example is: the words over their morphemes over their glosses,
 * wrapping word by word, then the free translation in single quotes. The
 * clicked words wear the reader's selected underline and take the focus;
 * the words a focused `es` or `damit` stands in for take a quiet wash.
 */
export function ClauseGloss({
	glossCase,
	knobs,
	focus,
	onFocus,
}: {
	readonly glossCase: GlossCase;
	readonly knobs: GlossKnobs;
	readonly focus: string | null;
	readonly onFocus: (key: string) => void;
}) {
	const lit = litBy(glossCase, focus);
	return (
		<figure
			{...langAttrs("de")}
			className={cn("m-0 grid gap-3", toneClass(glossCase))}
		>
			<div className="flex flex-wrap items-start gap-x-3.5 gap-y-3 text-sm">
				{glossCase.clause.map((column) => (
					<ClauseColumn
						key={column.id}
						column={column}
						knobs={knobs}
						on={lit.columns.has(column.id)}
						referent={lit.referents.has(column.id)}
						onFocus={onFocus}
					/>
				))}
			</div>
			<figcaption {...langAttrs("en")} className="text-sm text-ink-soft">
				‘{glossCase.clauseTranslation}’
			</figcaption>
		</figure>
	);
}

function ClauseColumn({
	column,
	knobs,
	on,
	referent,
	onFocus,
}: {
	readonly column: Column;
	readonly knobs: GlossKnobs;
	readonly on: boolean;
	readonly referent: boolean;
	readonly onFocus: (key: string) => void;
}) {
	const rows = (
		<>
			<span className="text-base leading-snug">
				<span
					className={cn(
						column.inUnit &&
							"text-link underline decoration-[0.11em] underline-offset-[0.18em]",
						column.inUnit && !on && "decoration-link/45",
					)}
				>
					{column.word}
				</span>
				{column.after ? (
					<span className="text-ink-soft">{column.after}</span>
				) : null}
			</span>
			{knobs.morphRow ? (
				<span
					className={cn(
						"italic",
						column.pieces[0]?.morph === column.word
							? "text-ink-faint"
							: "text-ink-soft",
					)}
				>
					{column.pieces.map((piece) => piece.morph).join("-")}
				</span>
			) : null}
			<span className="text-ink-muted">
				{knobs.style === "plain" ? (
					<span {...langAttrs("en")}>{column.plain}</span>
				) : (
					column.pieces.map((piece, index) => (
						<Fragment key={`${index}:${piece.leipzig}`}>
							{index > 0 ? "-" : null}
							<GlossText
								gloss={
									knobs.style === "leipzig"
										? piece.leipzig
										: piece.spelled
								}
							/>
						</Fragment>
					))
				)}
			</span>
		</>
	);
	const className = cn(
		"grid justify-items-start gap-0.5 rounded-sm text-start",
		columnWidth(knobs.style),
		referent &&
			"bg-link/12 shadow-[0_0_0_3px_color-mix(in_oklab,var(--link)_12%,transparent)]",
	);
	return column.inUnit ? (
		<button
			type="button"
			aria-pressed={on}
			onClick={() => onFocus(columnKey(column.id))}
			className={cn(
				className,
				"cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-link",
			)}
		>
			{rows}
		</button>
	) : (
		<div className={className}>{rows}</div>
	);
}
