import { type KeyboardEvent, memo, type PointerEvent } from "react";
import type { Place } from "tabletop/core";
import { Body, Glare, Shell } from "tabletop/react";
import { NoteFace, PlainBack } from "./note-face";
import { noteCard } from "./words";

const FACE =
	"rounded-[0.9rem] border border-line-strong shadow-[0_0.4rem_1.2rem_#0004]";

/** What a Note Card does with the hand and the keyboard: stable across renders. */
export type CardHandlers = {
	readonly press: (
		id: string,
		open: boolean,
		event: PointerEvent<HTMLElement>,
	) => void;
	/** The pointer entered or moved over the Card, or left it (`null`). */
	readonly hover: (
		id: string,
		open: boolean,
		event: PointerEvent<HTMLElement> | null,
	) => void;
	readonly key: (id: string, open: boolean, event: KeyboardEvent) => void;
	readonly close: () => void;
};

function samePlace(a: Place, b: Place): boolean {
	return (
		a.slot === b.slot &&
		a.rotate === b.rotate &&
		a.scale === b.scale &&
		a.z === b.z &&
		a.side === b.side &&
		a.form === b.form
	);
}

/**
 * One Note Card as a Body: focusable, opened by a tap or Enter, carried by
 * the hand. It renders again only when its own Place changes.
 */
export const NoteBody = memo(
	function NoteBody({
		id,
		place,
		handlers,
	}: {
		readonly id: string;
		readonly place: Place;
		readonly handlers: CardHandlers;
	}) {
		const card = noteCard(id);
		if (!card) return null;
		const open = place.form === "cover";
		return (
			<Body
				id={id}
				place={place}
				data-slot={place.slot}
				role="button"
				tabIndex={0}
				aria-label={card.title}
				aria-expanded={open}
				className={`rounded-[0.9rem] outline-none focus-visible:ring-2 focus-visible:ring-ring/70 ${open ? "" : "cursor-grab"}`}
				onPointerDown={(event) => handlers.press(id, open, event)}
				onPointerEnter={(event) => handlers.hover(id, open, event)}
				onPointerMove={(event) => handlers.hover(id, open, event)}
				onPointerLeave={() => handlers.hover(id, open, null)}
				onKeyDown={(event) => handlers.key(id, open, event)}
			>
				<Shell
					faceClassName={FACE}
					front={
						<>
							<NoteFace
								card={card}
								form={place.form}
								onClose={handlers.close}
							/>
							<Glare />
						</>
					}
					back={
						<>
							<PlainBack />
							<Glare />
						</>
					}
				/>
			</Body>
		);
	},
	(before, after) =>
		before.id === after.id &&
		before.handlers === after.handlers &&
		samePlace(before.place, after.place),
);
