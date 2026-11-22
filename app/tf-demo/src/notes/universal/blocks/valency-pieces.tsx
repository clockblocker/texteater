import type { ReactNode } from "react";

/**
 * The two styles a note prints valency in, wherever it shows some: a
 * governed preposition (`mit`, `auf`, `with`, `к`) and a slot (`jM`,
 * `something`, `чему-то`). The German Valency Line and a Reading's
 * translations share them (ADR 0055).
 */
export function ValencyPreposition({
	children,
}: {
	readonly children: ReactNode;
}) {
	return (
		<span
			data-slot="valency-preposition"
			className="font-normal text-ink-soft"
		>
			{children}
		</span>
	);
}

/**
 * A slot: the German line's case token (`token`, monospaced and softened), a
 * German free-marker placeholder (`placeholder`, proportional sans in soft
 * ink), or a translation's placeholder (`gloss`, proportional sans in muted
 * ink).
 */
export function ValencySlot({
	children,
	variant = "token",
}: {
	readonly children: ReactNode;
	readonly variant?: "token" | "placeholder" | "gloss";
}) {
	const className =
		variant === "gloss"
			? "text-ink-muted"
			: variant === "placeholder"
				? "font-normal text-ink-soft"
				: "font-mono text-[0.82em] font-[450] text-ink-soft";
	return (
		<span data-slot="valency-token" className={className}>
			{children}
		</span>
	);
}
