import type * as Dumspec from "dumspec/types";
import { ReaderPlainSegment, ReaderSegment } from "lego";
import { useMemo } from "react";
import type { UnitView } from "../shared/contract";

/** What the reader points at: one unit, or one No Target Segment. */
export type Focus =
	| { kind: "unit"; index: number }
	| { kind: "noTarget"; segment: number };

export const sameFocus = (left: Focus | null, right: Focus | null) =>
	left !== null &&
	right !== null &&
	(left.kind === "unit"
		? right.kind === "unit" && left.index === right.index
		: right.kind === "noTarget" && left.segment === right.segment);

/**
 * The sentence from its Segments. Hovering a word previews every member of
 * its unit; clicking selects the unit. A No Target Segment is marked with a
 * dotted rule, and a word in no target or No Target entry stays faint.
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
	segments: readonly Dumspec.Segment[];
	units: readonly UnitView[];
	noTarget: readonly Dumspec.NoTarget[];
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
	const reasonOf = useMemo(
		() => new Map(noTarget.map((entry) => [entry.segment, entry.reason])),
		[noTarget],
	);
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
				const reason = reasonOf.get(index);
				const focus: Focus | undefined =
					unit !== undefined
						? { kind: "unit", index: unit }
						: reason !== undefined
							? { kind: "noTarget", segment: index }
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
				return (
					<ReaderSegment
						key={key}
						tone={unit !== undefined ? "known" : "unknown"}
						interaction={interaction(focus)}
						className={
							unit === undefined
								? "underline decoration-dotted"
								: undefined
						}
						title={
							reason === undefined
								? undefined
								: `No Target: ${reason}`
						}
						data-segment={index}
						data-unit={unit}
						data-no-target={reason === undefined ? undefined : ""}
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
