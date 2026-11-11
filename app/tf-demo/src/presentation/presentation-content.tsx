import {
	type CSSProperties,
	type ReactElement,
	type ReactNode,
	useRef,
} from "react";
import {
	formLayout,
	type HeadingFace,
	headingRowRem,
	type PresentationForm,
} from "./form";
import {
	CardTitleRow,
	cardFaceClass,
	type HeadingControl,
	SheetChrome,
	useFolded,
} from "./heading";
import { RestingControls } from "./resting-controls";
import { sheetColumn } from "./skin";

/** What the content hands a host to draw one of its parts with. */
type PartDom = {
	readonly className: string;
	readonly style?: CSSProperties;
	readonly children?: ReactNode;
	readonly "aria-hidden"?: "true";
	readonly [data: `data-${string}`]: string | boolean | undefined;
};

/**
 * How a host draws the parts that change with the form. The content says
 * what each part is and where it sits; a host with an engine draws each
 * as an element the engine moves, and adds the motion. Left out, every
 * part is a plain element and a change of form is drawn at once.
 */
export type ContentDrawing = {
	/** The Heading row, `heightRem` tall; `face` is `null` where it folds shut. */
	readonly row: (
		dom: PartDom,
		row: { readonly face: HeadingFace | null; readonly heightRem: number },
	) => ReactElement;
	/** Wraps the row's face, so the one leaving can overlap the one arriving. */
	readonly faces: (face: ReactNode) => ReactNode;
	/** The row's words in one face; `face` is its key. */
	readonly face: (dom: PartDom, face: HeadingFace) => ReactElement;
	/** The Body's scroller. */
	readonly scroller: (dom: PartDom) => ReactElement;
	/** The fade a Card's Body ends in at the box's lower edge. */
	readonly fade: (dom: PartDom, shown: boolean) => ReactElement;
};

const STILL: ContentDrawing = {
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
	faces: (face) => face,
	face: (dom, face) => <div key={face} {...dom} />,
	scroller: (dom) => <div {...dom} />,
	fade: (dom, shown) => <div {...dom} style={{ opacity: shown ? 1 : 0 }} />,
};

/**
 * A Sheet's Heading is its bar, so its Note's first Block keeps only the
 * air it keeps under one.
 */
const SHEET_BODY_UNDER_BAR = "[&_[data-note-presentation]>article]:pt-0";

/**
 * What a Presentation's box holds, in one of its forms (tf-demo ADR
 * 0006): the Heading row, pinned first, and the Body with its scroller and
 * clip. The content column has one width in every form, centred inside a
 * Heading and a scroller that both span the box, so the scrollbar sits at
 * the box's edge, not the column's.
 *
 * As a Card the Heading is the one-line title row, at the lower edge when
 * the Card is folded below the open one. As a Cover it is the Cover's
 * bar: ← and × around the title, folding to the bar's height once the
 * Body scrolls. As a Ground it folds shut, because the Pane bar carries
 * the label. The row is one element in every form; only its words change.
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
	draw = STILL,
}: {
	readonly form: PresentationForm;
	/** The content column the Subject lays out in as a Sheet, in rem. */
	readonly columnRem: number;
	/** The Heading Block's words: as a Card's title row, and as a Cover's title. */
	readonly heading: { readonly card: ReactNode; readonly cover: ReactNode };
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
	readonly draw?: ContentDrawing;
}) {
	const root = useRef<HTMLDivElement>(null);
	const layout = formLayout(form);
	const folded = useFolded(root, form === "cover");
	const { column, body: coverWidth } = sheetColumn(columnRem, layout.sheet);
	const { face } = layout;
	return (
		<div
			ref={root}
			className={`flex min-h-0 w-full flex-1 flex-col ${quiet ? "opacity-50" : ""}`}
		>
			{draw.row(
				{
					"data-heading": "",
					"data-folded": face === "cover" ? folded : undefined,
					className: `relative w-full shrink-0 overflow-hidden select-none ${grab ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
					style: { order: layout.headingAtFoot ? 2 : 0 },
					children: (
						<>
							{draw.faces(
								face === "card"
									? draw.face(
											{
												className: cardFaceClass(
													layout.headingAtFoot,
												),
												children: (
													<CardTitleRow
														column={column}
														atFoot={
															layout.headingAtFoot
														}
													>
														{heading.card}
													</CardTitleRow>
												),
											},
											"card",
										)
									: face === "cover"
										? draw.face(
												{
													className:
														"absolute inset-0",
													children: (
														<SheetChrome
															ruled={folded}
															maxWidth={
																coverWidth
															}
															back={
																chrome?.back ??
																null
															}
															clear={
																chrome?.clear ??
																null
															}
														>
															{heading.cover}
														</SheetChrome>
													),
												},
												"cover",
											)
										: null,
							)}
							{face ? keys : null}
						</>
					),
				},
				{ face, heightRem: headingRowRem(form, folded) },
			)}
			{/* the Blocks travel with the Heading: the row it vacates is the
			    row they take */}
			{draw.scroller({
				"data-scroller": "",
				className: `relative order-1 min-h-0 flex-1 ${layout.scrolls ? "overflow-y-auto" : "overflow-hidden"} ${layout.sheet ? SHEET_BODY_UNDER_BAR : ""}`,
				children: (
					<>
						<RestingControls resting={layout.resting}>
							{body}
						</RestingControls>
						{/* the Card's clip fades its content out; the Sheet lifts the fade */}
						{draw.fade(
							{
								"aria-hidden": "true",
								className:
									"pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-paper to-transparent",
							},
							layout.fades,
						)}
					</>
				),
			})}
		</div>
	);
}
