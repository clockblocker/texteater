import {
	clampMorph,
	type NoteSectionChrome,
	NoteSurfaceProvider,
	noteMorphStyle,
	useNoteSurface,
} from "lego";
import {
	type CSSProperties,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useRef,
} from "react";
import {
	formLayout,
	type HeadingFace,
	headingRowRem,
	type PresentationForm,
} from "./form";
import { type HeadingControl, PresentationHeading, useFolded } from "./heading";
import {
	CARD_CLIP_FADE_OPACITY_CSS,
	headingHeightRemAt,
	headingMaxWidthCss,
	type PresentationMorphState,
	presentationMorphTarget,
} from "./morph";
import { RestingControls } from "./resting-controls";

/** What the content hands a host to draw one of its parts with. */
type PartDom = {
	readonly ref?: RefObject<HTMLDivElement | null>;
	readonly className: string;
	readonly style?: CSSProperties;
	readonly children?: ReactNode;
	readonly "aria-hidden"?: "true";
	readonly [data: `data-${string}`]: string | boolean | undefined;
};

/**
 * How a host draws the parts that change with the form. The content says
 * what each part is and where it sits; a host with an engine draws each
 * as an element the engine moves, and drives `--note-morph` (`0` = Card,
 * `1` = Sheet) on `surface` so the Heading and every Body block morph
 * continuously together. Left out, every part is a plain element and a
 * change of form is drawn at once.
 */
export type ContentDrawing = {
	/** Whether `--note-morph` is currently animating in flight. */
	readonly morphing?: boolean;
	/** The root content surface owning `--note-morph` for Heading and Body. */
	readonly surface?: (
		dom: PartDom,
		morph: PresentationMorphState,
	) => ReactElement;
	/** The Heading row, `heightRem` tall; `face` is `null` where it folds shut. */
	readonly row: (
		dom: PartDom,
		row: { readonly face: HeadingFace | null; readonly heightRem: number },
	) => ReactElement;
	/** The Body's scroller. */
	readonly scroller: (dom: PartDom) => ReactElement;
	/** The fade a Card's Body ends in at the box's lower edge. */
	readonly fade: (dom: PartDom, shown: boolean) => ReactElement;
};

const STILL: ContentDrawing = {
	surface: (dom, { progress }) => (
		<div
			{...dom}
			style={{
				...noteMorphStyle(progress),
				...dom.style,
			}}
		/>
	),
	row: (dom, { face, heightRem }) => (
		<div
			{...dom}
			style={{
				...dom.style,
				height: `${heightRem.toString()}rem`,
				opacity: face ? 1 : 0,
			}}
		/>
	),
	scroller: (dom) => <div {...dom} />,
	fade: (dom) => <div {...dom} />,
};

type SplitHeading = { readonly card: ReactNode; readonly cover: ReactNode };

function isSplitHeading(
	value: ReactNode | SplitHeading,
): value is SplitHeading {
	return (
		typeof value === "object" &&
		value !== null &&
		"card" in value &&
		"cover" in value
	);
}

function resolveHeadingNode(
	heading: ReactNode | SplitHeading,
	chromeActive: boolean,
): ReactNode {
	if (!isSplitHeading(heading)) return heading;
	return chromeActive ? heading.cover : heading.card;
}

function resolveHeadingHeightRem(
	form: PresentationForm,
	face: HeadingFace | null,
	folded: boolean,
	morph: number | undefined,
	progress: number,
): number {
	return morph !== undefined && face !== null
		? headingHeightRemAt(progress, folded)
		: headingRowRem(form, folded);
}

/**
 * What a Presentation's box holds, in one of its forms (tf-demo ADR 0006):
 * ONE persistent Heading row and ONE Body scroller inside a single declarative
 * `NoteSurface` driven by `--note-morph` (`0` = Card, `1` = Sheet).
 *
 * Heading chrome (`←` and `×`), title scale, gutters, block gaps, padding,
 * typography, and section labels all read the same `--note-morph` scalar so
 * Card -> Sheet transitions stay visually continuous without dual heading
 * DOM forks or blur crossfades.
 */
export function PresentationContent({
	form,
	columnRem,
	heading,
	body,
	chrome = null,
	grab = false,
	keys = null,
	quiet = false,
	morph,
	sectionChrome,
	draw = STILL,
}: {
	readonly form: PresentationForm;
	/** The content column the Subject lays out in as a Sheet, in rem. */
	readonly columnRem: number;
	/**
	 * The Heading Block's words: either a single unified `ReactNode` or a
	 * legacy `{ card, cover }` pair. Both render inside one persistent heading
	 * layout with no crossfade fork.
	 */
	readonly heading: ReactNode | SplitHeading;
	/** Every other Block, as `form` shows them. */
	readonly body: ReactNode;
	/** A Cover's ← and ×, drawn in its Heading. */
	readonly chrome?: {
		readonly back: HeadingControl | null;
		readonly clear: HeadingControl | null;
	} | null;
	/** The Heading row is the Cover's lift handle right now. */
	readonly grab?: boolean;
	/** The keyboard's handles for this Heading; see `KeyHandles`. */
	readonly keys?: ReactNode;
	/** A ghost: its ink is quiet, on paper as opaque as any. */
	readonly quiet?: boolean;
	/**
	 * Optional explicit morph progress in `[0, 1]` (`0` = Card, `1` = Sheet)
	 * for direct scrubbing or previewing without a custom motion engine.
	 */
	readonly morph?: number;
	/** Section label & divider morph strategy; defaults to `"reveal"`. */
	readonly sectionChrome?: NoteSectionChrome;
	readonly draw?: ContentDrawing;
}) {
	const root = useRef<HTMLDivElement>(null);
	const inheritedSurface = useNoteSurface();
	const layout = formLayout(form);
	const folded = useFolded(root, form === "cover");
	const target = presentationMorphTarget(form);
	const progress = morph !== undefined ? clampMorph(morph) : target;
	const mode = progress >= 0.5 ? "sheet" : "card";
	const chromeActive =
		layout.face === "cover" || (morph !== undefined && progress >= 0.5);
	const resolvedChrome = sectionChrome ?? inheritedSurface.sectionChrome;
	const { face } = layout;
	const heightRem = resolveHeadingHeightRem(
		form,
		face,
		folded,
		morph,
		progress,
	);
	const headingNode = resolveHeadingNode(heading, chromeActive);
	const renderSurface = draw.surface ?? STILL.surface;
	const morphState: PresentationMorphState = {
		form,
		mode,
		sheet: layout.sheet,
		target,
		progress,
		sectionChrome: resolvedChrome,
	};
	const fadeShown =
		morph !== undefined
			? progress < 0.99 && !layout.headingAtFoot
			: layout.fades;
	const isMorphing =
		Boolean(draw.morphing) ||
		(morph !== undefined && progress > 0 && progress < 1);
	const foldTransition =
		form === "cover" && morph === undefined && !isMorphing;
	const headingElement =
		face !== null ? (
			<PresentationHeading
				maxWidth={headingMaxWidthCss(columnRem)}
				atFoot={layout.headingAtFoot}
				folded={face === "cover" && folded}
				foldTransition={foldTransition}
				resting={layout.resting}
				chromeActive={chromeActive}
				back={chrome?.back ?? null}
				clear={chrome?.clear ?? null}
			>
				{headingNode}
			</PresentationHeading>
		) : null;

	return (
		<NoteSurfaceProvider
			value={{
				mode,
				morph: progress,
				sectionChrome: resolvedChrome,
				managed: true,
			}}
		>
			{renderSurface?.(
				{
					ref: root,
					"data-note-surface": mode,
					"data-morphing": isMorphing || undefined,
					"data-density": mode === "card" ? "compact" : "comfortable",
					"data-section-chrome": resolvedChrome,
					className: `flex min-h-0 w-full flex-1 flex-col ${quiet ? "opacity-50" : ""}`,
					children: (
						<>
							{draw.row(
								{
									"data-heading": "",
									"data-folded":
										face === "cover" ? folded : undefined,
									className: `relative w-full shrink-0 overflow-hidden select-none ${grab ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
									style: {
										order: layout.headingAtFoot ? 2 : 0,
									},
									children: (
										<>
											{headingElement}
											{face ? keys : null}
										</>
									),
								},
								{ face, heightRem },
							)}
							{/* the Blocks travel with the Heading: the row it vacates is the
							    row they take */}
							{draw.scroller({
								"data-scroller": "",
								"data-under-heading-bar": "",
								className: `relative order-1 min-h-0 flex-1 overscroll-y-contain ${layout.scrolls ? "overflow-y-auto" : "overflow-hidden"}`,
								children: (
									<>
										<RestingControls
											resting={layout.resting}
										>
											{body}
										</RestingControls>
										{/* the Card's clip fades its content out; the Sheet lifts the fade declaratively via --note-morph */}
										{draw.fade(
											{
												"aria-hidden": "true",
												className:
													"pointer-events-none sticky bottom-0 -mt-8 h-8 bg-linear-to-t/oklab from-[var(--note-bg,var(--paper))] to-transparent",
												style: {
													opacity:
														layout.headingAtFoot
															? 0
															: CARD_CLIP_FADE_OPACITY_CSS,
												},
											},
											fadeShown,
										)}
									</>
								),
							})}
						</>
					),
				},
				morphState,
			)}
		</NoteSurfaceProvider>
	);
}
