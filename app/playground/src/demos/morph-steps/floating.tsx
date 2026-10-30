import { cn } from "lego";
import { X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode, RefObject } from "react";
import type { Box, Placement, Scene } from "./placement";

/** The Deck's preferred width, as tf-demo's Deck roughly has it. */
export const cardWidth = 360;

export type Measured = Omit<Scene, "stack">;

/**
 * lemma-hop's floating Deck box: placed beside the sentence, with its
 * close button. Invisible until placed; a clamped Deck scrolls inside
 * (`scrollRef`).
 */
export function FloatingDeck({
	placement,
	openKey,
	scrollRef,
	contentRef,
	reducedMotion,
	onClose,
	children,
}: {
	readonly placement: Placement | null;
	/** A new key replays the open. */
	readonly openKey: string;
	readonly scrollRef: RefObject<HTMLDivElement | null>;
	readonly contentRef: (element: HTMLDivElement | null) => void;
	readonly reducedMotion: boolean;
	readonly onClose: () => void;
	readonly children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"pointer-events-auto absolute",
				!placement && "invisible",
			)}
			style={{
				insetInlineStart: placement?.box.start ?? 0,
				top: placement?.box.top ?? 0,
				width: placement?.box.width ?? cardWidth,
			}}
		>
			<motion.div
				key={openKey}
				initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
			>
				<div
					ref={scrollRef}
					className="overflow-y-auto overscroll-contain rounded-xl"
					style={{ maxHeight: placement?.maxHeight }}
				>
					<div ref={contentRef}>{children}</div>
				</div>
			</motion.div>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute -end-2 -top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-soft shadow hover:text-ink"
			>
				<X aria-hidden="true" className="size-3.5" />
			</button>
		</div>
	);
}

/** The word, its sentence's lines and the viewport, in logical px. */
export function measure(
	area: HTMLElement,
	scroller: HTMLElement,
	wordId: string,
	dir: "ltr" | "rtl",
): Measured | null {
	const wordElement = scroller.querySelector<HTMLElement>(
		`[data-word-id="${CSS.escape(wordId)}"]`,
	);
	if (!wordElement) return null;
	const sentenceElement =
		wordElement.closest<HTMLElement>("[data-sentence-id]") ?? wordElement;
	const origin = area.getBoundingClientRect();
	const toBox = (rect: DOMRect): Box => ({
		start:
			dir === "rtl" ? origin.right - rect.right : rect.left - origin.left,
		top: rect.top - origin.top,
		width: rect.width,
		height: rect.height,
	});
	return {
		view: { width: origin.width, height: origin.height },
		word: toBox(wordElement.getBoundingClientRect()),
		column: toBox(
			(
				scroller.querySelector("[data-ms-column]") ?? scroller
			).getBoundingClientRect(),
		),
		lines: [...sentenceElement.getClientRects()]
			.filter((rect) => rect.width > 1)
			.map(toBox),
		scrollRoom: {
			back: scroller.scrollTop,
			forward:
				scroller.scrollHeight -
				scroller.clientHeight -
				scroller.scrollTop,
		},
	};
}
