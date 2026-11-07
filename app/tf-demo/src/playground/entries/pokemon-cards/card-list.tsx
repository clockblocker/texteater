import { useAtomValue } from "@effect/atom-react";
import { type ReactNode, useRef } from "react";
import { activeCardAtom } from "./active-card";

/** `src/Cards.svelte`: a section's grid, raised while it holds the active Card. */
export function CardList({ children }: { readonly children: ReactNode }) {
	const gridRef = useRef<HTMLElement>(null);
	const activeCard = useAtomValue(activeCardAtom);
	const active =
		activeCard !== undefined && !!gridRef.current?.contains(activeCard);
	return (
		<section
			ref={gridRef}
			className={active ? "card-grid active" : "card-grid"}
		>
			{children}
		</section>
	);
}
