import { XIcon } from "lucide-react";
import { memo } from "react";
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
			{card.emoji ? <span aria-hidden="true">{card.emoji}</span> : null}
			<span className="truncate font-semibold text-ink">
				{card.title}
			</span>
			<span className="text-xs text-ink-muted">{card.caption}</span>
		</Part>
	);
}

/** The gloss: under the heading in every form, so no Part crosses another. */
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

const CARD_LAYOUT = "flex h-full flex-col gap-1.5 bg-paper px-4";
const COVER_LAYOUT =
	"flex h-full flex-col items-center gap-3 bg-paper px-4 pt-10";

/**
 * A Note Card's front in either form, as one tree, so each Part stays the
 * same element across forms. The Card shows its heading, gloss and first
 * Source context; the Cover keeps them in that order and adds the close
 * button, the other contexts and the lines, which exist in the Cover alone:
 * they fade in once the shared Parts have passed, and when the Cover closes
 * they stay pinned where they were and fade out on the same Move.
 */
export const NoteFace = memo(function NoteFace({
	card,
	form,
	onClose,
}: {
	readonly card: NoteCard;
	readonly form: string;
	readonly onClose: () => void;
}) {
	const [first = "", ...more] = card.contexts;
	return (
		<div className={form === "cover" ? COVER_LAYOUT : CARD_LAYOUT}>
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
			<Gloss card={card} />
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
});

/**
 * Every Note's back, for now: the plain default background (#1309 Q5). A
 * Card dealt from a click carries the clicked word on it (#1316).
 */
export const PlainBack = memo(function PlainBack({
	word,
}: {
	readonly word?: string | null;
}) {
	return (
		<div className="grid h-full place-items-center bg-canvas">
			{word ? (
				<span className="font-semibold text-ink-soft text-lg">
					{word}
				</span>
			) : null}
		</div>
	);
});
