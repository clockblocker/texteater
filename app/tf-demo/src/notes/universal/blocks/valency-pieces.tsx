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
		<span data-slot="valency-preposition" className="font-semibold">
			{children}
		</span>
	);
}

/** A slot: the German line's case token, or a translation's placeholder. */
export function ValencySlot({ children }: { readonly children: ReactNode }) {
	return (
		<span
			data-slot="valency-token"
			className="font-mono text-[0.9em] text-ink-soft"
		>
			{children}
		</span>
	);
}
