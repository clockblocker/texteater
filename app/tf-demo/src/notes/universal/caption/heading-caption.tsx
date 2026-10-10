import { cn, NoteTitleRow } from "lego";
import type { ReactNode } from "react";
import type { CaptionLanguages } from "./caption";
import {
	type Caption,
	type CaptionToken,
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
 * A Heading with its title and its caption, if it has one, on one line: a
 * Card Tail shows one row. The Heading takes the whole width it is given,
 * also where a Card lays its title out in a row. The title keeps the width
 * it needs and the caption truncates in what is left. In the pile the
 * caption ends at its relation, above the next Card's tail; as a Sheet it
 * names that Card's title itself (tf-demo ADR 0006 lets a Heading's words
 * vary by form).
 */
export function CaptionedHeading({
	title,
	caption,
	presentation,
}: {
	readonly title: ReactNode;
	readonly caption: Caption | null;
	readonly presentation?: "Card" | "Sheet";
}) {
	const tokens = caption
		? presentation === "Card"
			? caption.card
			: caption.sheet
		: null;
	return (
		<header className="min-w-0 flex-1">
			<NoteTitleRow className="flex-nowrap justify-start gap-x-1.5">
				{title}
				{tokens ? (
					<span
						data-heading-caption=""
						className="min-w-0 flex-[1_1_0] truncate text-sm text-ink-muted"
					>
						<span
							aria-hidden="true"
							className="me-1.5 text-ink-faint"
						>
							{uiWordings[UI_LANGUAGE].captionSeparator}
						</span>
						<CaptionTokens tokens={tokens} />
					</span>
				) : null}
			</NoteTitleRow>
		</header>
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
						token.current
							? "bg-ink/10 ring-1 ring-ink/30"
							: "opacity-60 grayscale",
					)}
				>
					{token.text}
				</span>
			);
	}
}
