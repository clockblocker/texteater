import type { ReactNode } from "react";
import { cardBoxRem } from "@/presentation/deck-geometry";
import {
	formLayout,
	headingRowRem,
	type PresentationForm,
} from "@/presentation/form";
import type { HeadingControl } from "@/presentation/heading";
import { PresentationBox } from "@/presentation/presentation-box";
import { PresentationContent } from "@/presentation/presentation-content";

export function Stage({
	label,
	className = "",
	children,
}: {
	label: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section aria-label={label} className={`grid gap-2 ${className}`}>
			<h2 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				{label}
			</h2>
			{children}
		</section>
	);
}

/**
 * What a Subject shows in each form: the two faces of its Heading, and
 * its Body as a Card and as a Sheet.
 */
export type StagedParts = {
	/** What the Subject is called, for its box's accessible name. */
	readonly label: string;
	/** The content column it lays out in as a Sheet, in rem. */
	readonly columnRem: number;
	readonly heading: { readonly card: ReactNode; readonly cover: ReactNode };
	readonly body: { readonly card: ReactNode; readonly sheet: ReactNode };
};

const FORM_NAMES: Readonly<Record<PresentationForm, string>> = {
	card: "card",
	"tail-above": "card tail",
	"tail-below": "card tail",
	cover: "cover",
	ground: "ground",
	sheet: "sheet",
};

/**
 * One Presentation at rest in the page's flow, drawn by the foundation the
 * app's renderer draws it with: the same box and the same content, with no
 * engine around them. A Card is the size it rests at alone in a Deck. A
 * Card Tail is that Card cut off under its Heading row, where the next
 * Card would cover it. A Sheet takes the room its stage gives it.
 */
export function StagedPresentation({
	form,
	parts,
	chrome = null,
}: {
	readonly form: PresentationForm;
	readonly parts: StagedParts;
	/** A Cover's ← and ×. */
	readonly chrome?: {
		readonly back: HeadingControl | null;
		readonly clear: HeadingControl | null;
	} | null;
}) {
	const { sheet } = formLayout(form);
	const card = cardBoxRem();
	const box = (
		<PresentationBox
			form={form}
			liftable={false}
			aria-label={`${parts.label} ${FORM_NAMES[form]}`}
			className={`relative max-w-full ${sheet ? "h-[calc(100svh-7rem)] min-h-[34rem] w-full" : ""}`}
			style={
				sheet
					? undefined
					: {
							width: `${card.width.toString()}rem`,
							height: `${card.height.toString()}rem`,
						}
			}
		>
			<PresentationContent
				form={form}
				columnRem={parts.columnRem}
				heading={parts.heading}
				body={sheet ? parts.body.sheet : parts.body.card}
				chrome={chrome}
			/>
		</PresentationBox>
	);
	if (form !== "tail-above") return box;
	/* the padding is room for the Card's shadow; the foot is cut clean */
	return (
		<div className="-m-4 overflow-hidden p-4 pb-0">
			<div style={{ height: `${headingRowRem(form).toString()}rem` }}>
				{box}
			</div>
		</div>
	);
}
