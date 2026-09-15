import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "lego";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";

import { type DummyNote, deckFor, type NoteLink, noteById } from "./dummy";
import { DummyReader, ModelShell, NoteBody, useEventLog } from "./shared";

/**
 * MODEL B — Flick.
 *
 * Inspiration: Tinder, iOS app switcher. The deck is a physical pile of Cards
 * anchored under the selected word. Only the top Card is touchable: flick it
 * left to throw it away, flick it right to keep it in a side Pane, tap it to
 * zoom it into a Sheet. A Sheet is nothing but a zoomed Card, so it cannot be
 * closed directly: press ← in its header (or drag it down) and it shrinks
 * back onto the pile, where a flick disposes of it. The header carries the
 * trail back to the Text. Following a link deals a new Card onto the
 * pile and zooms it, so the pile is also the history.
 */

type DeckCard = { readonly id: number; readonly note: DummyNote };
type Flight = { readonly id: number; readonly dx: number };

const FLICK_THRESHOLD = 110;
const TOP_HEIGHT = "22rem";
const FOOTER_HEIGHT = "2.75rem";
const DROP_THRESHOLD = 120;

const RULES = [
	{
		move: "Flick ←",
		means: "Throws the top Card away. The only way a Card dies.",
	},
	{ move: "Flick →", means: "Keeps the Card in the side Pane." },
	{ move: "Tap card", means: "Zooms it into a Sheet over the Text." },
	{ move: "Tap footer", means: "Brings that covered Card to the top." },
	{
		move: "← / Drag ↓",
		means: "Shrinks the Sheet back to its Card. Never closes.",
	},
	{
		move: "Esc",
		means: "Shrink if a Sheet is up, otherwise flick ← the top Card.",
	},
	{ move: "Follow link", means: "Deals a new Card on top and zooms it." },
	{ move: "New word", means: "Sweeps the pile and deals four fresh Cards." },
	{ move: "Click page", means: "Nothing." },
];

export function FlickModel() {
	const { entries, log, clear } = useEventLog();
	const [selected, setSelected] = useState<string | null>(null);
	const [deck, setDeck] = useState<readonly DeckCard[]>([]);
	const [kept, setKept] = useState<readonly DeckCard[]>([]);
	const [openId, setOpenId] = useState<number | null>(null);
	const [flights, setFlights] = useState<readonly Flight[]>([]);
	const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
	const [anchorTop, setAnchorTop] = useState(8 * 16);
	const nextId = useRef(1);
	const stage = useRef<HTMLDivElement>(null);
	const pointerStart = useRef<{ x: number; y: number; id: number } | null>(
		null,
	);

	const top = deck[0] ?? null;
	const open = openId === null ? null : deck.find((c) => c.id === openId);

	function throwAway(card: DeckCard, reason: string) {
		log(`${reason}: ${card.note.kind} thrown away`);
		setFlights((f) => [...f, { id: card.id, dx: -720 }]);
		window.setTimeout(() => {
			setDeck((d) => d.filter((c) => c.id !== card.id));
			setFlights((f) => f.filter((x) => x.id !== card.id));
		}, 220);
	}
	function keep(card: DeckCard) {
		log(`Flick →: ${card.note.kind} kept in side Pane`);
		setFlights((f) => [...f, { id: card.id, dx: 720 }]);
		window.setTimeout(() => {
			setDeck((d) => d.filter((c) => c.id !== card.id));
			setFlights((f) => f.filter((x) => x.id !== card.id));
			setKept((k) => [...k, card]);
		}, 220);
	}
	function shrink(reason: string) {
		if (open)
			log(`${reason}: ${open.note.kind} shrinks back onto the pile`);
		setOpenId(null);
		setDrag(null);
	}

	function bringToTop(card: DeckCard) {
		log(`Tap footer: ${card.note.kind} brought to the top`);
		setDeck([card, ...deck.filter((c) => c.id !== card.id)]);
	}

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (openId !== null) {
				shrink("Esc");
				return;
			}
			if (top) throwAway(top, "Esc");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	function deal(word: string, element: HTMLElement) {
		setSelected(word);
		setOpenId(null);
		const stageBox = stage.current?.getBoundingClientRect();
		const box = element.getBoundingClientRect();
		if (stageBox) setAnchorTop(box.bottom - stageBox.top + 14);
		log(
			`Select "${word}": ${deck.length ? `sweep ${deck.length.toString()}, ` : ""}deal 4`,
		);
		setDeck(deckFor(word).map((note) => ({ id: nextId.current++, note })));
	}

	function follow(link: NoteLink) {
		if (link.kind === "Text") {
			log(`Go to source "${link.word}": Sheet shrinks, word reselected`);
			setSelected(link.word);
			setOpenId(null);
			return;
		}
		const card = { id: nextId.current++, note: noteById(link.noteId) };
		log(`Follow ${link.label}: dealt on top and zoomed`);
		setDeck((d) => [card, ...d]);
		setOpenId(card.id);
	}

	/* --- pointer: top card flick --- */
	function cardDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0) return;
		pointerStart.current = {
			x: event.clientX,
			y: event.clientY,
			id: event.pointerId,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		setDrag({ dx: 0, dy: 0 });
	}
	function cardMove(event: ReactPointerEvent<HTMLElement>) {
		const start = pointerStart.current;
		if (!start || start.id !== event.pointerId) return;
		setDrag({ dx: event.clientX - start.x, dy: event.clientY - start.y });
	}
	function cardUp(event: ReactPointerEvent<HTMLElement>) {
		const start = pointerStart.current;
		if (!start || start.id !== event.pointerId || !top) return;
		pointerStart.current = null;
		const dx = event.clientX - start.x;
		const dy = event.clientY - start.y;
		setDrag(null);
		if (dx < -FLICK_THRESHOLD) throwAway(top, "Flick ←");
		else if (dx > FLICK_THRESHOLD) keep(top);
		else if (Math.hypot(dx, dy) < 6) {
			log(`Tap: ${top.note.kind} zooms into a Sheet`);
			setOpenId(top.id);
		}
	}

	/* --- pointer: sheet drag down --- */
	function sheetDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0) return;
		pointerStart.current = {
			x: event.clientX,
			y: event.clientY,
			id: event.pointerId,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		setDrag({ dx: 0, dy: 0 });
	}
	function sheetUp(event: ReactPointerEvent<HTMLElement>) {
		const start = pointerStart.current;
		if (!start || start.id !== event.pointerId) return;
		pointerStart.current = null;
		const dy = event.clientY - start.y;
		if (dy > DROP_THRESHOLD) shrink("Drag ↓");
		else setDrag(null);
	}

	function reset() {
		setSelected(null);
		setDeck([]);
		setKept([]);
		setOpenId(null);
		setFlights([]);
		setDrag(null);
		clear();
	}

	const pile = deck.filter((c) => c.id !== openId);

	const stageView = (
		<div ref={stage} className="relative h-full min-h-0 overflow-hidden">
			<div className="h-full overflow-auto bg-paper">
				<DummyReader
					selected={selected}
					onSelect={({ word, element }) => deal(word, element)}
				/>
			</div>

			{/* the pile: the top Card in full, every covered Card as a footer beneath it */}
			<div
				className="pointer-events-none absolute left-1/2 w-[26rem] -translate-x-1/2"
				style={{ top: anchorTop }}
			>
				{[...pile].reverse().map((card) => {
					const index = pile.indexOf(card);
					const isTop = index === 0;
					const flight = flights.find((f) => f.id === card.id);
					const dx = flight ? flight.dx : isTop && drag ? drag.dx : 0;
					const dragging = isTop && drag !== null && !flight;
					const style: CSSProperties = {
						insetInline: 0,
						top: 0,
						height: `calc(${TOP_HEIGHT} + ${index.toString()} * ${FOOTER_HEIGHT})`,
						transform: `translateX(${dx.toString()}px) rotate(${(dx / 18).toString()}deg)`,
						zIndex: 10 - index,
						transition: dragging
							? "none"
							: "transform 220ms ease-out, height 220ms",
					};
					return (
						<article
							key={card.id}
							aria-label={`${card.note.kind} card`}
							data-covered={!isTop}
							style={style}
							onPointerDown={isTop ? cardDown : undefined}
							onPointerMove={isTop ? cardMove : undefined}
							onPointerUp={isTop ? cardUp : undefined}
							data-last={index === pile.length - 1}
							className="pointer-events-auto absolute flex touch-none flex-col justify-end overflow-hidden rounded-t-[0.9rem] border border-line-strong bg-paper shadow-[0_1rem_2rem_#0005] select-none data-[covered=false]:cursor-grab data-[last=true]:rounded-b-[0.9rem] data-[covered=false]:active:cursor-grabbing"
						>
							{isTop ? (
								<>
									{dx !== 0 ? (
										<div
											aria-hidden="true"
											className={`pointer-events-none absolute top-3 z-10 rounded-md border px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${dx < 0 ? "right-3 border-destructive text-destructive" : "left-3 border-link text-link"}`}
											style={{
												opacity: Math.min(
													1,
													Math.abs(dx) /
														FLICK_THRESHOLD,
												),
											}}
										>
											{dx < 0 ? "Throw away" : "Keep"}
										</div>
									) : null}
									<div className="pointer-events-none min-h-0 flex-1 overflow-hidden">
										<NoteBody
											note={card.note}
											compact
											onFollow={() => {}}
										/>
									</div>
									<div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper to-transparent" />
								</>
							) : (
								<button
									type="button"
									aria-label={`Bring ${card.note.kind} to the top`}
									onClick={() => bringToTop(card)}
									className="flex shrink-0 items-center justify-between gap-4 px-4 text-start hover:bg-raised/60"
									style={{ height: FOOTER_HEIGHT }}
								>
									<span className="truncate font-serif text-[1rem] text-ink">
										{card.note.tail.form}
									</span>
									<span className="shrink-0 text-[0.72rem] text-ink-muted">
										{card.note.tail.gloss}
									</span>
								</button>
							)}
						</article>
					);
				})}
			</div>

			{/* the zoomed card = sheet */}
			{open ? (
				<section
					aria-label={`${open.note.kind} sheet`}
					className="absolute inset-x-6 top-4 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[0.9rem] border border-b-0 border-line-strong bg-paper shadow-[0_-0.5rem_2.5rem_#0006]"
					style={{
						transform: `translateY(${Math.max(0, drag?.dy ?? 0).toString()}px)`,
						transition: drag ? "none" : "transform 220ms ease-out",
					}}
				>
					<header
						onPointerDown={sheetDown}
						onPointerMove={cardMove}
						onPointerUp={sheetUp}
						className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b border-line ps-2 pe-3 py-1 select-none active:cursor-grabbing"
					>
						<button
							type="button"
							aria-label="Shrink back to card"
							title="Shrink back to card"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={() => shrink("←")}
							className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[0.9rem] text-link hover:bg-raised"
						>
							←
						</button>
						<nav
							aria-label="Trail"
							className="flex min-w-0 items-center gap-1 truncate font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
						>
							<span>Text</span>
							<span aria-hidden="true">›</span>
							<span className="text-ink">
								{open.note.kind} · {open.note.title}
							</span>
						</nav>
					</header>
					<div className="min-h-0 flex-1 overflow-auto">
						<NoteBody note={open.note} onFollow={follow} />
					</div>
				</section>
			) : null}
		</div>
	);

	return (
		<ModelShell rules={RULES} entries={entries} onReset={reset}>
			{kept.length === 0 ? (
				stageView
			) : (
				<ResizablePanelGroup orientation="horizontal">
					<ResizablePanel id="stage" minSize={360}>
						{stageView}
					</ResizablePanel>
					<ResizableHandle aria-label="Resize kept pane" />
					<ResizablePanel id="kept" minSize={240} defaultSize={30}>
						<div className="h-full overflow-auto bg-paper">
							{kept.map((card) => (
								<section
									key={card.id}
									className="border-b border-line"
								>
									<div className="flex items-center justify-between ps-3 pe-1 py-1">
										<span className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
											Kept · {card.note.kind}
										</span>
										<button
											type="button"
											className="rounded-md px-2 py-0.5 text-[0.72rem] text-ink-soft hover:bg-raised hover:text-ink"
											onClick={() => {
												log(
													`Return ${card.note.kind} to the pile`,
												);
												setKept((k) =>
													k.filter(
														(c) => c.id !== card.id,
													),
												);
												setDeck((d) => [card, ...d]);
											}}
										>
											↩ to pile
										</button>
									</div>
									<NoteBody
										note={card.note}
										compact
										onFollow={follow}
									/>
								</section>
							))}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</ModelShell>
	);
}
