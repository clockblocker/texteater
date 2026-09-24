import { AnimatePresence, motion } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	cleanWord,
	type DummyNote,
	type DummyText,
	type NoteLink,
	noteFor,
	type SourceContext,
	type TextFocus,
} from "./dummy";
import { useDeckInteractions } from "./interaction-policy";
import { type NoteForm, type Subject, subjectOfLink } from "./model";
import { after, CONTEXT_PAGE } from "./motion-spec";
import { useDeckMotion } from "./runtime-config";

/** A Note's Blocks and a Text's Sentences, and the Segments inside them. */

/** How many Source Contexts a Card shows. A Sheet's page is the spec's. */
export const CARD_CONTEXTS = 2;

/**
 * A Segment: a word that deals when clicked and lifts when dragged, in
 * Sheet form. In Card form it is inert text (issue 485, provisional).
 */
export function Segment({
	word,
	live,
	lit,
	focused,
	onSegment,
	onSegmentDown,
}: {
	word: string;
	live: boolean;
	lit: boolean;
	focused: boolean;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	if (!live)
		return (
			<span data-segment={word} className={lit ? "text-ink" : undefined}>
				{word}
			</span>
		);
	return (
		<button
			type="button"
			data-word={word}
			aria-pressed={lit}
			aria-current={focused ? "location" : undefined}
			onPointerDown={(event) =>
				onSegmentDown(event, () => ({
					kind: "Note",
					note: noteFor("Reading", word),
				}))
			}
			onClick={(event) => onSegment(word, event.currentTarget)}
			className="rounded-[0.2rem] px-[0.08em] text-word-unknown decoration-word-resolving decoration-[1.5px] underline-offset-[0.2em] hover:underline aria-[current=location]:bg-selection/40 aria-pressed:bg-selection aria-pressed:text-selection-foreground"
		>
			{word}
		</button>
	);
}

/** A Text's Blocks: its Sentences, every word a Segment once it is a Sheet. */
export function TextBlock({
	text,
	focus,
	form,
	shown,
	litWord,
	onSegment,
	onSegmentDown,
}: {
	text: DummyText;
	focus: TextFocus | null;
	form: NoteForm;
	shown: boolean;
	litWord: string | null;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const sheet = form === "sheet";
	const lit = useRef<HTMLParagraphElement>(null);
	const block = useRef<HTMLDivElement>(null);
	/* a Cover pushed by Go to source arrives scrolled to its Sentence */
	useEffect(() => {
		if (sheet && focus) lit.current?.scrollIntoView({ block: "center" });
	}, [sheet, focus]);
	/* room under the last Sentence, so any Sentence can be scrolled clear
	   of the Deck: as tall as the body that scrolls it */
	const [trailer, setTrailer] = useState(0);
	useLayoutEffect(() => {
		if (!sheet) return;
		const scroller = block.current?.closest<HTMLElement>("[data-scroller]");
		if (!scroller) return;
		const measure = () => setTrailer(scroller.clientHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [sheet, shown]);
	if (!shown) return null;
	return (
		<div
			ref={block}
			data-block="text"
			className={`font-serif text-ink ${sheet ? "px-4 pt-4 text-[1.15rem] leading-[1.71rem]" : "text-[0.9rem] leading-relaxed"}`}
		>
			{text.sentences.map((sentence, sentenceIndex) => {
				const focused = focus?.sentence === sentenceIndex;
				return (
					<p
						key={sentence.join(" ")}
						ref={focused ? lit : undefined}
						data-sentence={sentenceIndex}
						className={`${sheet ? "mb-[1.75rem]" : "mb-2"} ${focused ? "rounded-md bg-raised/60 -mx-2 px-2" : ""}`}
					>
						{sentence.map((word, index) => (
							<span key={`${word}-${index.toString()}`}>
								<Segment
									word={word}
									live={sheet}
									lit={
										litWord !== null &&
										cleanWord(word) === litWord
									}
									focused={
										focused &&
										cleanWord(word) === focus.word
									}
									onSegment={onSegment}
									onSegmentDown={onSegmentDown}
								/>
								{index < sentence.length - 1 ? " " : ""}
							</span>
						))}
					</p>
				);
			})}
			{sheet ? (
				<div aria-hidden="true" style={{ height: trailer }} />
			) : null}
		</div>
	);
}

/**
 * Source Contexts: pinned, part of the Anchor. A Card shows the two most
 * recent; a Sheet shows a page and can load more. In a Sheet, every word
 * is a Segment that deals a Deck belonging to that Sheet.
 */
export function ContextsBlock({
	note,
	form,
	litWord,
	onSegment,
	onSegmentDown,
}: {
	note: DummyNote;
	form: NoteForm;
	litWord: string | null;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const allows = useDeckInteractions();
	const { transition, CONTEXT_ITEM, contextDelayFor } = useDeckMotion();
	const sheet = form === "sheet";
	const [shown, setShown] = useState(CONTEXT_PAGE);
	useEffect(() => {
		if (!sheet) setShown(CONTEXT_PAGE);
	}, [sheet]);
	const visible = note.contexts.slice(0, sheet ? shown : CARD_CONTEXTS);
	const more = note.contexts.length - visible.length;
	/**
	 * Where the arriving group starts, so the stagger counts from the first
	 * item that is actually new rather than from the top of the list.
	 */
	const settled = useRef(visible.length);
	const arrivingFrom = settled.current;
	useEffect(() => {
		settled.current = visible.length;
	}, [visible.length]);
	return (
		<div data-block="contexts" className="flex flex-col gap-1">
			<div className="flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				<span>Source contexts</span>
				<span>{note.contexts.length.toString()}</span>
			</div>
			<ul className="flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
				<AnimatePresence initial={false}>
					{visible.map((context, index) => (
						<motion.li
							key={contextKey(context)}
							initial={{ opacity: 0, height: 0 }}
							animate={{
								opacity: 1,
								height: "auto",
								transition: transition(
									after(
										CONTEXT_ITEM,
										contextDelayFor(index - arrivingFrom),
									),
								),
							}}
							exit={{
								opacity: 0,
								height: 0,
								transition: transition(CONTEXT_ITEM),
							}}
							className="overflow-hidden"
						>
							{context.words.map((word, wordIndex) => (
								<span key={`${word}-${wordIndex.toString()}`}>
									<Segment
										word={word}
										live={sheet}
										lit={
											cleanWord(word) === note.word ||
											(litWord !== null &&
												cleanWord(word) === litWord)
										}
										focused={false}
										onSegment={onSegment}
										onSegmentDown={onSegmentDown}
									/>
									{wordIndex < context.words.length - 1
										? " "
										: ""}
								</span>
							))}
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
			{sheet && more > 0 ? (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						if (allows("contexts"))
							setShown((n) => n + CONTEXT_PAGE);
					}}
					disabled={!allows("contexts")}
					className="self-start text-[0.72rem] text-link underline-offset-2 hover:underline"
				>
					{`Load ${Math.min(more, CONTEXT_PAGE).toString()} more`}
				</button>
			) : null}
		</div>
	);
}

export function contextKey(context: SourceContext): string {
	return `${context.textId ?? "filler"}:${context.sentence.toString()}:${context.words.join(" ")}`;
}

/** The Note's lines. The same in every form; a Card only clips them. */
export function BodyBlock({ note }: { note: DummyNote }) {
	return (
		<div
			data-block="body"
			className="space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft"
		>
			{note.lines.map((line, index) => (
				<p key={`${index.toString()}-${line}`}>{line}</p>
			))}
		</div>
	);
}

/**
 * Onward Links. In a Sheet a tap pushes a Cover and a drag lifts the
 * target as a fresh Card; in a Card they are inert (issue 485, provisional).
 */
export function LinksBlock({
	note,
	form,
	onFollow,
	onSegmentDown,
}: {
	note: DummyNote;
	form: NoteForm;
	onFollow: (link: NoteLink) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
}) {
	const allows = useDeckInteractions();
	const live = form === "sheet";
	return (
		<ul
			data-block="links"
			className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]"
		>
			{note.links.map((link) => {
				const label =
					link.kind === "Text"
						? `↩ ${link.label} (${link.focus.word})`
						: link.label;
				return (
					<li key={link.label}>
						{live ? (
							<button
								type="button"
								data-link={link.label}
								disabled={!allows("follow")}
								onPointerDown={(event) => {
									event.stopPropagation();
									onSegmentDown(event, () =>
										subjectOfLink(link),
									);
								}}
								onClick={(event) => {
									event.stopPropagation();
									onFollow(link);
								}}
								className="text-link decoration-link-shadow decoration-[1.5px] underline-offset-[0.2em] hover:underline disabled:no-underline"
							>
								{label}
							</button>
						) : (
							<span data-link={link.label} className="text-link">
								{label}
							</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}
