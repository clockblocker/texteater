import { cn, ReaderSegment } from "lego";
import type { FixtureText, FixtureWord } from "./text";

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
			lang={text.lang}
			dir={text.lang === "he" ? "rtl" : "ltr"}
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
							{sentence.tokens.map((token, tokenIndex) =>
								token.kind === "gap" ? (
									<span key={`gap-${tokenIndex}`}>
										{token.text}
									</span>
								) : (
									<ReaderSegment
										key={token.id}
										data-word-id={token.id}
										interaction={
											isSelected(token)
												? "selected"
												: "hover"
										}
										onClick={(event) => {
											const element = event.currentTarget;
											const sentenceElement =
												element.closest<HTMLElement>(
													"[data-sentence-id]",
												) ?? element;
											onWordClick?.({
												word: token,
												element,
												rect: element.getBoundingClientRect(),
												sentenceElement,
												sentenceRect:
													sentenceElement.getBoundingClientRect(),
											});
										}}
									>
										{token.text}
									</ReaderSegment>
								),
							)}
						</span>
					))}
				</p>
			))}
		</div>
	);
}

function findWord(text: FixtureText, id: string): FixtureWord | undefined {
	for (const paragraph of text.paragraphs)
		for (const sentence of paragraph.sentences)
			for (const token of sentence.tokens)
				if (token.kind === "word" && token.id === id) return token;
	return undefined;
}
