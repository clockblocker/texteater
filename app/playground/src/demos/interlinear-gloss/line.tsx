import { cn } from "lego";
import { Fragment, type ReactNode } from "react";
import type { Target, TokenStyle } from "./model";

/**
 * tf-demo's valency styles, copied because the playground doesn't import
 * the app: a governed preposition in italics, a slot as its mono case
 * token (`ValencyPreposition`, `ValencySlot`).
 */
export function tokenClass(style: TokenStyle | undefined): string {
	if (style === "slot") return "font-mono text-[0.9em] text-ink-soft";
	if (style === "prep") return "italic";
	return "";
}

/** A slotted line as tf-demo's heading prints it: `jD mit jM zu tun hatte`. */
export function SlottedLine({
	tokens,
	render,
}: {
	readonly tokens: readonly Pick<Target, "id" | "text" | "style">[];
	/** Wraps each token, for a gloss that marks or lights it. */
	readonly render?: (
		token: Pick<Target, "id" | "text" | "style">,
		text: ReactNode,
	) => ReactNode;
}) {
	return tokens.map((token, index) => {
		const text = (
			<span className={cn(tokenClass(token.style))}>{token.text}</span>
		);
		return (
			<Fragment key={token.id}>
				{index > 0 ? " " : null}
				{render ? render(token, text) : text}
			</Fragment>
		);
	});
}
