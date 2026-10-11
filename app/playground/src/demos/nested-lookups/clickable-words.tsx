import { cn, ReaderSegment } from "lego";
import { useMemo } from "react";
import { type FixtureWord, textFromParagraphs } from "@/fixtures";

/** A word clicked inside a Card: the next lookup's query and its anchor. */
export type CardWordClick = {
	readonly word: FixtureWord | string;
	/** The `data-word-id` of the clicked element, to anchor a child on. */
	readonly anchorId: string;
};

/**
 * A line of Card text whose words are buttons, inline so it sits inside a
 * Card's paragraph. Word ids start with `id`, so they stay unique across
 * every open lookup, and a clicked word carries its sentence, which the
 * next lookup quotes. `marks` are set in the link colour, as a Card's
 * quote marks the looked-up words.
 */
export function ClickableWords({
	id,
	text,
	marks = [],
	selectedId,
	onWord,
}: {
	readonly id: string;
	readonly text: string;
	readonly marks?: readonly string[];
	readonly selectedId?: string | null;
	readonly onWord: (click: CardWordClick) => void;
}) {
	const sentences = useMemo(
		() =>
			textFromParagraphs(id, "de", "", [text]).paragraphs.flatMap(
				(paragraph) => paragraph.sentences,
			),
		[id, text],
	);
	return (
		<>
			{sentences.map((sentence, index) => (
				<span key={sentence.id} data-sentence-id={sentence.id}>
					{index > 0 ? " " : null}
					{sentence.tokens.map((token, tokenIndex) =>
						token.kind === "gap" ? (
							<span key={`gap-${tokenIndex}`}>{token.text}</span>
						) : (
							<ReaderSegment
								key={token.id}
								data-word-id={token.id}
								interaction={
									token.id === selectedId
										? "selected"
										: "hover"
								}
								className={cn(
									marks.includes(token.text) && "text-link",
									token.id === selectedId && "text-ink",
								)}
								onClick={(event) => {
									event.stopPropagation();
									onWord({ word: token, anchorId: token.id });
								}}
							>
								{token.text}
							</ReaderSegment>
						),
					)}
				</span>
			))}
		</>
	);
}
