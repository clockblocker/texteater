import {
	type KeyboardEvent,
	memo,
	type PointerEvent,
	useCallback,
	useMemo,
} from "react";
import type { Place } from "tabletop/core";
import { Body, Glare, Shell } from "tabletop/react";
import { NoteFace, PlainBack } from "./note-face";
import { TurnControl } from "./turn-control";
import type { NoteCard } from "./words";

const FACE =
	"rounded-[0.9rem] border border-line-strong shadow-[0_0.4rem_1.2rem_#0004]";

/** What a Note Card does with the hand and the keyboard: stable across renders. */
export type CardHandlers = {
	/** The corner control's axis when it turns Cards, or `null` (#1315). */
	readonly control: "x" | "y" | null;
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
	readonly turn: (id: string) => void;
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
 * the hand. It renders again only when its own Place changes, and its
 * faces only when its form or its word does.
 */
export const NoteBody = memo(
	function NoteBody({
		id,
		card,
		word,
		busy,
		place,
		handlers,
	}: {
		readonly id: string;
		readonly card: NoteCard;
		/** The word it was dealt from, which its back carries. */
		readonly word: string | null;
		/** Waiting for its Knowledge: face down and announced once it lands. */
		readonly busy: boolean;
		readonly place: Place;
		readonly handlers: CardHandlers;
	}) {
		const open = place.form === "cover";
		const { form } = place;
		const onTurn = useCallback(() => handlers.turn(id), [handlers, id]);
		/* the faces stay the same elements while only the Place moves */
		const faces = useMemo(() => {
			const control = handlers.control ? (
				<TurnControl axis={handlers.control} onTurn={onTurn} />
			) : null;
			return {
				front: (
					<>
						<NoteFace
							card={card}
							form={form}
							onClose={handlers.close}
						/>
						{control}
						<Glare />
					</>
				),
				back: (
					<>
						<PlainBack word={word} />
						{control}
						<Glare />
					</>
				),
			};
		}, [card, form, word, handlers, onTurn]);
		return (
			<Body
				id={id}
				place={place}
				data-slot={place.slot}
				role="button"
				tabIndex={0}
				aria-label={busy && word ? word : card.title}
				aria-busy={busy || undefined}
				aria-expanded={open}
				className={`group/card rounded-[0.9rem] outline-none focus-visible:ring-2 focus-visible:ring-ring/70 ${open ? "" : "cursor-grab"}`}
				onPointerDown={(event) => handlers.press(id, open, event)}
				onPointerEnter={(event) => handlers.hover(id, open, event)}
				onPointerMove={(event) => handlers.hover(id, open, event)}
				onPointerLeave={() => handlers.hover(id, open, null)}
				onKeyDown={(event) => handlers.key(id, open, event)}
			>
				<Shell
					faceClassName={FACE}
					front={faces.front}
					back={faces.back}
				/>
			</Body>
		);
	},
	(before, after) =>
		before.id === after.id &&
		before.card === after.card &&
		before.word === after.word &&
		before.busy === after.busy &&
		before.handlers === after.handlers &&
		samePlace(before.place, after.place),
);
