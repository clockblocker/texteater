import { useAtomValue } from "@effect/atom-react";
import { type RefObject, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	arrowBetween,
	arrowStart,
	type Box,
	lineBoxes,
	loopAround,
	loopEdgeToward,
	nearestBox,
} from "@/views/pen-strokes";
import type { ExplanationStatus } from "@/views/pronoun-explainer";
import {
	type ExplainerTarget,
	shownPronounAtom,
} from "@/views/pronoun-explainer-atoms";

type Antecedents = Extract<
	ExplanationStatus,
	{ state: "Resolved" }
>["antecedents"];

/** Where the marks go on screen, measured from the reader's Segments. */
type Geometry = {
	readonly pronoun: Box;
	readonly clip: Box;
	readonly marks: readonly {
		readonly key: string;
		readonly loops: readonly Box[];
		readonly target: Box;
	}[];
};

const segmentElement = (root: HTMLElement, sentenceId: string, index: number) =>
	root.querySelector<HTMLElement>(
		`[data-sentence="${sentenceId}"] [data-segment="${index}"]`,
	);

const boxOf = ({ left, top, right, bottom }: Box): Box => ({
	left,
	top,
	right,
	bottom,
});

const centreOf = (box: Box) => ({
	x: (box.left + box.right) / 2,
	y: (box.top + box.bottom) / 2,
});

/**
 * Measures the shown pronoun's chunk and each Antecedent's line boxes in
 * the reader; an Antecedent whose Sentence is not on the page (a book page
 * not loaded) is left out. The marks are clipped to the reader's scroller.
 */
function measure(
	root: HTMLElement,
	shown: ExplainerTarget,
	antecedents: Antecedents,
): Geometry | null {
	const chunk =
		segmentElement(root, shown.sentenceId, shown.segmentIndex) ??
		segmentElement(root, shown.sentenceId, shown.pronoun[0] ?? -1);
	if (!chunk) return null;
	const pronoun = boxOf(chunk.getBoundingClientRect());
	const marks = antecedents.flatMap(({ sentenceId, segments }) => {
		const rects = segments.flatMap((index) => [
			...(segmentElement(root, sentenceId, index)?.getClientRects() ??
				[]),
		]);
		const loops = lineBoxes(rects.map(boxOf));
		const target = nearestBox(loops, centreOf(pronoun));
		return target
			? [{ key: `${sentenceId}:${segments.join(",")}`, loops, target }]
			: [];
	});
	const scroller = root.closest<HTMLElement>("[data-scroller]") ?? root;
	return { pronoun, clip: boxOf(scroller.getBoundingClientRect()), marks };
}

/**
 * The pen marks of the pronoun the explainer shows, once its explanation
 * is Resolved: a thin green loop around each Antecedent and an arrow from
 * the pronoun's chunk to each. They sit over the page in viewport
 * coordinates, measured again on any scroll or resize, so an Antecedent
 * paragraphs back is still pointed at. The strokes draw in where motion is
 * allowed (`index.css`) and stand drawn at once where it is reduced.
 */
export function PenMarks({
	reader,
	statusOf,
}: {
	readonly reader: RefObject<HTMLElement | null>;
	readonly statusOf: (
		sentenceId: string,
		pronoun: readonly number[],
	) => ExplanationStatus;
}) {
	const shown = useAtomValue(shownPronounAtom);
	const status = shown ? statusOf(shown.sentenceId, shown.pronoun) : null;
	const antecedents =
		status?.state === "Resolved" ? status.antecedents : null;
	const [geometry, setGeometry] = useState<Geometry | null>(null);
	const clipId = useId();

	useLayoutEffect(() => {
		const root = reader.current;
		if (!shown || !antecedents?.length || !root) {
			setGeometry(null);
			return;
		}
		const update = () => setGeometry(measure(root, shown, antecedents));
		update();
		let frame = 0;
		const onChange = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		window.addEventListener("scroll", onChange, {
			capture: true,
			passive: true,
		});
		window.addEventListener("resize", onChange);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onChange, { capture: true });
			window.removeEventListener("resize", onChange);
		};
	}, [reader, shown, antecedents]);

	if (!shown || !geometry || geometry.marks.length === 0) return null;
	const seed = `${shown.sentenceId}:${shown.pronoun.join(",")}`;
	const { clip } = geometry;
	return createPortal(
		<svg
			aria-hidden="true"
			data-slot="pen-marks"
			className="pointer-events-none fixed inset-0 z-50 size-full"
		>
			<defs>
				<clipPath id={clipId}>
					<rect
						x={clip.left}
						y={clip.top}
						width={clip.right - clip.left}
						height={clip.bottom - clip.top}
					/>
				</clipPath>
			</defs>
			<g className="pen-mark" clipPath={`url(#${clipId})`}>
				{geometry.marks.map(({ key, loops, target }) => {
					const from = arrowStart(geometry.pronoun, centreOf(target));
					const to = loopEdgeToward(target, from);
					const arrow = arrowBetween(from, to, `${seed}>${key}`);
					return (
						<g key={key} data-antecedent={key}>
							{loops.map((box, line) => (
								<path
									key={line}
									className="pen-stroke"
									pathLength={1}
									d={loopAround(box, `${key}#${line}`)}
								/>
							))}
							<path
								className="pen-stroke pen-stroke-arrow"
								pathLength={1}
								d={arrow.shaft}
							/>
							<path
								className="pen-stroke pen-stroke-head"
								pathLength={1}
								d={arrow.head}
							/>
						</g>
					);
				})}
			</g>
		</svg>,
		document.body,
	);
}
