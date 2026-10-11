import { cn, NoteTitleLink, ReaderSegment } from "lego";
import { type ReactNode, useMemo } from "react";
import { langAttrs, type RunLanguage, textFromParagraphs } from "@/fixtures";

/**
 * Links that previews know about. Each is a button carrying the word it
 * leads to in `data-hp-link`; the preview layer listens on the frame, so a
 * link needs no handlers of its own, wherever it sits: a Card, a Sheet or
 * another preview.
 */

/** Every word of a line of Card text, each a link to its own entry. */
export function LinkedWords({
	id,
	text,
	lang = "de",
	marks = [],
}: {
	readonly id: string;
	readonly text: string;
	readonly lang?: RunLanguage;
	/** Words set in the link colour, as a Card's quote marks its words. */
	readonly marks?: readonly string[];
}) {
	const sentences = useMemo(
		() =>
			textFromParagraphs(id, "de", "", [text]).paragraphs.flatMap(
				(paragraph) => paragraph.sentences,
			),
		[id, text],
	);
	return (
		<span {...langAttrs(lang)}>
			{sentences.map((sentence, index) => (
				<span key={sentence.id}>
					{index > 0 ? " " : null}
					{sentence.tokens.map((token, tokenIndex) =>
						token.kind === "gap" ? (
							<span key={`gap-${tokenIndex}`}>{token.text}</span>
						) : (
							<ReaderSegment
								key={token.id}
								data-hp-link={token.text}
								interaction="hover"
								className={cn(
									"[-webkit-touch-callout:none] select-none",
									marks.includes(token.text) && "text-link",
								)}
							>
								{token.text}
							</ReaderSegment>
						),
					)}
				</span>
			))}
		</span>
	);
}

/** A headword link, as a Card's `lemma → gehen`. */
export function TitleLink({
	word,
	lang,
	children,
}: {
	readonly word: string;
	readonly lang: RunLanguage;
	readonly children?: ReactNode;
}) {
	return (
		<NoteTitleLink
			{...langAttrs(lang)}
			data-hp-link={word}
			className="[-webkit-touch-callout:none] text-link select-none"
		>
			{children ?? word}
		</NoteTitleLink>
	);
}
