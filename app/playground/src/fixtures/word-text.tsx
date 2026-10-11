import { cn, ReaderSegment } from "lego";
import { langAttrs } from "./lang";
import type { FixtureText, FixtureToken, FixtureWord } from "./text";

/** What a click on a word reports. Rects are viewport rects. */
export type WordClick = {
	readonly word: FixtureWord;
	readonly element: HTMLElement;
	readonly rect: DOMRect;
	/** The sentence the word stands in, for placements that keep it clear. */
	readonly sentenceElement: HTMLElement;
	readonly sentenceRect: DOMRect;
};

/**
 * `rect` relative to `container`'s border box, e.g. a click's rect inside
 * the playground frame, ready for `position: absolute` in it.
 */
export function rectWithin(rect: DOMRect, container: Element): DOMRect {
	const origin = container.getBoundingClientRect();
	return new DOMRect(
		rect.x - origin.x + container.scrollLeft,
		rect.y - origin.y + container.scrollTop,
		rect.width,
		rect.height,
	);
}

/**
 * A reading text whose words are buttons. The selected word, and every
 * other member of its unit (`fängt … an`), shows the selected underline.
 * Sentences are `[data-sentence-id]` spans and words `[data-word-id]`
 * buttons, for demos that measure them. The text sets its own direction
 * from its language, so German stays left-to-right in an RTL frame.
 * Punctuation is glued to its word in a no-break span (`Kiosk.`, `„Wann`),
 * so a line never starts with a full stop or comma; only the word itself is
 * a button.
 */
export function WordText({
	text,
	selectedWordId,
	onWordClick,
	className,
}: {
	readonly text: FixtureText;
	readonly selectedWordId?: string | null;
	readonly onWordClick?: (click: WordClick) => void;
	readonly className?: string;
}) {
	const selectedUnit = selectedWordId
		? findWord(text, selectedWordId)?.unitId
		: undefined;
	const isSelected = (word: FixtureWord) =>
		word.id === selectedWordId ||
		(selectedUnit !== undefined && word.unitId === selectedUnit);

	return (
		<div
			{...langAttrs(text.lang)}
			className={cn(
				"grid gap-4 text-lg leading-[1.7] text-ink",
				className,
			)}
		>
			{text.paragraphs.map((paragraph) => (
				<p key={paragraph.id}>
					{paragraph.sentences.map((sentence, index) => (
						<span key={sentence.id} data-sentence-id={sentence.id}>
							{index > 0 ? " " : null}
							{glued(sentence.tokens).map((piece, pieceIndex) =>
								typeof piece === "string" ? (
									<span key={`gap-${pieceIndex}`}>
										{piece}
									</span>
								) : (
									<span
										key={piece.word.id}
										className="whitespace-nowrap"
									>
										{piece.before}
										<ReaderSegment
											data-word-id={piece.word.id}
											interaction={
												isSelected(piece.word)
													? "selected"
													: "hover"
											}
											onClick={(event) => {
												const element =
													event.currentTarget;
												const sentenceElement =
													element.closest<HTMLElement>(
														"[data-sentence-id]",
													) ?? element;
												onWordClick?.({
													word: piece.word,
													element,
													rect: element.getBoundingClientRect(),
													sentenceElement,
													sentenceRect:
														sentenceElement.getBoundingClientRect(),
												});
											}}
										>
											{piece.word.text}
										</ReaderSegment>
										{piece.after}
									</span>
								),
							)}
						</span>
					))}
				</p>
			))}
		</div>
	);
}

/** A word with the punctuation that touches it, which must not break off. */
type GluedWord = {
	readonly word: FixtureWord;
	readonly before: string;
	readonly after: string;
};

/**
 * A sentence's tokens as glued words and the gaps left between them. A
 * gap's text up to its first space sticks to the word before it, and its
 * text after its last space to the word after it.
 */
function glued(tokens: readonly FixtureToken[]): (GluedWord | string)[] {
	const pieces: (GluedWord | string)[] = [];
	let before = "";
	tokens.forEach((token, index) => {
		if (token.kind === "word") {
			pieces.push({ word: token, before, after: "" });
			before = "";
			return;
		}
		let rest = token.text;
		const previous = pieces.at(-1);
		if (typeof previous === "object" && previous !== null) {
			const head = /^\S*/u.exec(rest)?.[0] ?? "";
			pieces[pieces.length - 1] = { ...previous, after: head };
			rest = rest.slice(head.length);
		}
		if (tokens[index + 1]?.kind === "word") {
			const tail = /\S*$/u.exec(rest)?.[0] ?? "";
			before = tail;
			rest = rest.slice(0, rest.length - tail.length);
		}
		if (rest) pieces.push(rest);
	});
	return pieces;
}

function findWord(text: FixtureText, id: string): FixtureWord | undefined {
	for (const paragraph of text.paragraphs)
		for (const sentence of paragraph.sentences)
			for (const token of sentence.tokens)
				if (token.kind === "word" && token.id === id) return token;
	return undefined;
}
