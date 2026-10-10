import { cn, NoteTitleRow } from "lego";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { CaptionLanguages } from "./caption";
import {
	type Caption,
	type CaptionToken,
	captionText,
	UI_LANGUAGE,
	uiWordings,
} from "./wording";

/**
 * The languages a Note's caption is written in, or null when its target
 * language has no wording yet.
 */
export function captionLanguages(language: string): CaptionLanguages | null {
	return language === "de" ? { ui: UI_LANGUAGE, target: language } : null;
}

/**
 * A Heading's title row with its caption, if it has one, on the same line:
 * a Card Tail shows one row. The title keeps its whole width and wraps
 * rather than truncate; the caption takes what is left.
 */
export function CaptionedTitleRow({
	title,
	caption,
}: {
	readonly title: ReactNode;
	readonly caption: Caption | null;
}) {
	return (
		<NoteTitleRow className="flex-nowrap justify-start gap-x-1.5">
			{title}
			{caption ? <HeadingCaption caption={caption} /> : null}
		</NoteTitleRow>
	);
}

/**
 * A Heading's caption, on the title's line after a `·`. It shows the full
 * caption when it fits beside the title and the compact one when it does
 * not; only then does it truncate. The title beside it never does.
 */
function HeadingCaption({ caption }: { readonly caption: Caption }) {
	const box = useRef<HTMLSpanElement>(null);
	const full = useRef<HTMLSpanElement>(null);
	const [fits, setFits] = useState(true);
	useLayoutEffect(() => {
		const boxElement = box.current;
		const fullElement = full.current;
		if (!boxElement || !fullElement) return;
		const measure = () =>
			setFits(fullElement.scrollWidth <= boxElement.clientWidth);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(boxElement);
		observer.observe(fullElement);
		return () => observer.disconnect();
	}, []);
	const shown = fits ? caption.full : caption.compact;
	return (
		<span
			ref={box}
			data-heading-caption=""
			data-caption-length={fits ? "full" : "compact"}
			className="relative min-w-0 flex-[1_1_0] overflow-hidden text-sm text-ellipsis whitespace-nowrap text-ink-muted"
		>
			<span aria-hidden="true" className="me-1.5 text-ink-faint">
				{uiWordings[UI_LANGUAGE].captionSeparator}
			</span>
			{fits ? null : (
				<span className="sr-only">{captionText(caption.full)}</span>
			)}
			<span aria-hidden={fits ? undefined : true}>
				<CaptionTokens tokens={shown} />
			</span>
			{/*
			 * Measures the full caption without repeating its words in the
			 * document: they sit in a pseudo-element, which no text or
			 * accessibility tree reads.
			 */}
			<span
				ref={full}
				aria-hidden="true"
				data-caption-measure={`${uiWordings[UI_LANGUAGE].captionSeparator}\u2002${captionText(caption.full)}`}
				className="pointer-events-none invisible absolute start-0 top-0 w-max before:content-[attr(data-caption-measure)]"
			/>
		</span>
	);
}

/** Caption tokens: each target-language run isolated for bidirectional text. */
function CaptionTokens({
	tokens,
}: {
	readonly tokens: readonly CaptionToken[];
}) {
	return tokens.map((token, index) => (
		<CaptionTokenElement key={`${index}:${token.kind}`} token={token} />
	));
}

function CaptionTokenElement({ token }: { readonly token: CaptionToken }) {
	switch (token.kind) {
		case "Word":
			return <span>{token.text}</span>;
		case "Target":
			return <bdi>{token.text}</bdi>;
		case "Next":
			return (
				<bdi data-caption-next="" className="text-ink-faint">
					{token.text}
				</bdi>
			);
		case "Emoji":
			return (
				<span
					data-caption-emoji=""
					aria-current={token.current || undefined}
					className={cn(
						"inline-block rounded-sm px-0.5",
						token.current ? "bg-ink/10 text-ink" : "opacity-50",
					)}
				>
					{token.text}
				</span>
			);
	}
}
