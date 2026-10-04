import type * as Dumcorpus from "dumcorpus/types";
import { cn, ReaderPlainSegment, ReaderSegment } from "lego";
import { useMemo } from "react";
import type { UnitView } from "../shared/contract";

/**
 * What the reader points at: one unit, or one No Target entry, which may hold
 * several Segments (`[der, Blarg]`).
 */
export type Focus =
	| { kind: "unit"; index: number }
	| { kind: "noTarget"; index: number };

export const sameFocus = (left: Focus | null, right: Focus | null) =>
	left !== null &&
	right !== null &&
	left.kind === right.kind &&
	left.index === right.index;

/**
 * The sentence from its Segments. Hovering a word previews every Segment of
 * its unit or No Target entry; clicking selects it. A No Target Segment is
 * marked with a dotted rule, which a preview darkens, and a word in no target
 * or No Target entry stays faint.
 */
export function Sentence({
	segments,
	units,
	noTarget,
	hovered,
	selected,
	onHover,
	onSelect,
}: {
	segments: readonly Dumcorpus.Segment[];
	units: readonly UnitView[];
	noTarget: readonly Dumcorpus.NoTarget[];
	hovered: Focus | null;
	selected: Focus | null;
	onHover: (focus: Focus | null) => void;
	onSelect: (focus: Focus) => void;
}) {
	const unitOf = useMemo(() => {
		const map = new Map<number, number>();
		for (const [index, unit] of units.entries())
			for (const segment of unit.memberSegmentIndices)
				map.set(segment, index);
		return map;
	}, [units]);
	const noTargetOf = useMemo(() => {
		const map = new Map<number, number>();
		for (const [index, entry] of noTarget.entries())
			for (const segment of entry.memberSegmentIndices)
				map.set(segment, index);
		return map;
	}, [noTarget]);
	const interaction = (focus: Focus) =>
		sameFocus(focus, selected)
			? "selected"
			: sameFocus(focus, hovered)
				? "previewed"
				: "idle";

	return (
		<p className="text-2xl leading-loose" lang="de" data-sentence>
			{segments.map((segment, index) => {
				const key = `${index}:${segment.text}`;
				if (segment.kind !== "ResolvableText")
					return (
						<ReaderPlainSegment key={key}>
							{segment.text}
						</ReaderPlainSegment>
					);
				const unit = unitOf.get(index);
				const entry = noTargetOf.get(index);
				const reason =
					entry === undefined ? undefined : noTarget[entry]?.reason;
				const focus: Focus | undefined =
					unit !== undefined
						? { kind: "unit", index: unit }
						: entry !== undefined
							? { kind: "noTarget", index: entry }
							: undefined;
				if (!focus)
					return (
						<ReaderPlainSegment
							key={key}
							className="text-ink-faint"
							title="In no target or No Target entry"
							data-segment={index}
						>
							{segment.text}
						</ReaderPlainSegment>
					);
				const state = interaction(focus);
				return (
					<ReaderSegment
						key={key}
						tone={unit !== undefined ? "known" : "unknown"}
						interaction={state}
						className={
							unit === undefined
								? cn(
										"underline decoration-dotted",
										state === "previewed" &&
											"decoration-current",
									)
								: undefined
						}
						title={
							reason === undefined
								? undefined
								: `No Target: ${reason}`
						}
						data-segment={index}
						data-unit={unit}
						data-no-target={entry}
						onMouseEnter={() => onHover(focus)}
						onMouseLeave={() => onHover(null)}
						onFocus={() => onHover(focus)}
						onBlur={() => onHover(null)}
						onClick={() => onSelect(focus)}
					>
						{segment.text}
					</ReaderSegment>
				);
			})}
		</p>
	);
}
