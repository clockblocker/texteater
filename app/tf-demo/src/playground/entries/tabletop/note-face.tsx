import { XIcon } from "lucide-react";
import { Part } from "tabletop/react";
import type { NoteCard } from "./words";

/** The Note's one column: the same width in every form, so text never rewraps. */
const COLUMN = "w-[14rem] shrink-0";

function Heading({ card }: { readonly card: NoteCard }) {
	return (
		<Part
			id="heading"
			className={`${COLUMN} flex h-10 items-baseline gap-2 pt-2.5`}
		>
			<span className="truncate font-semibold text-ink">
				{card.title}
			</span>
			<span className="text-xs text-ink-muted">{card.caption}</span>
		</Part>
	);
}

function Gloss({ card }: { readonly card: NoteCard }) {
	return (
		<Part id="gloss" className={`${COLUMN} text-sm text-ink-soft`}>
			{card.gloss}
		</Part>
	);
}

function Context({ text, id }: { readonly text: string; readonly id: string }) {
	return (
		<Part
			id={id}
			className={`${COLUMN} text-sm leading-snug text-ink italic`}
		>
			„{text}“
		</Part>
	);
}

/**
 * A Note Card's front in either form. The Card shows its heading, gloss
 * and first Source context; the Cover moves the gloss below every context
 * and adds the close button, the other contexts and the lines, which fade
 * in after the move. Each part keeps its id across forms, so it travels to
 * its new place rather than appearing there.
 */
export function NoteFace({
	card,
	form,
	onClose,
}: {
	readonly card: NoteCard;
	readonly form: string;
	readonly onClose: () => void;
}) {
	const [first = "", ...more] = card.contexts;
	if (form !== "cover")
		return (
			<div className="flex h-full flex-col gap-1.5 bg-paper px-4">
				<Heading card={card} />
				<Gloss card={card} />
				<Context id="context-0" text={first} />
			</div>
		);
	return (
		<div className="flex h-full flex-col items-center gap-3 bg-paper px-4 pt-10">
			<Part id="close" only="cover" className="absolute end-2 top-2">
				<button
					type="button"
					aria-label="Close"
					className="grid size-8 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={onClose}
				>
					<XIcon aria-hidden="true" className="size-4" />
				</button>
			</Part>
			<Heading card={card} />
			<Context id="context-0" text={first} />
			{more.map((text, index) => (
				<Part
					key={text}
					id={`context-${index + 1}`}
					only="cover"
					className={`${COLUMN} text-sm leading-snug text-ink italic`}
				>
					„{text}“
				</Part>
			))}
			<Gloss card={card} />
			<Part
				id="lines"
				only="cover"
				className={`${COLUMN} grid gap-1 border-line border-t pt-3 text-xs text-ink-muted`}
			>
				{card.lines.map((line) => (
					<p key={line}>{line}</p>
				))}
			</Part>
		</div>
	);
}

/** Every Note's back, for now: the plain default background (#1309 Q5). */
export function PlainBack() {
	return <div className="h-full bg-canvas" />;
}
