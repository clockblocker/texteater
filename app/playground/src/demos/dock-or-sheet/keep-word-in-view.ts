import { useEffect, useRef, useState } from "react";

type Size = { readonly inlineSize: number; readonly blockSize: number };

/** `element`'s border-box size, kept current with a ResizeObserver. */
export function useSize(element: Element | null): Size {
	const [size, setSize] = useState<Size>({ inlineSize: 0, blockSize: 0 });
	useEffect(() => {
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			const box = entry?.borderBoxSize[0];
			if (box)
				setSize({
					inlineSize: Math.round(box.inlineSize),
					blockSize: Math.round(box.blockSize),
				});
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [element]);
	return size;
}

/** Room kept between the word and the visible edge of the text. */
const margin = 24;

/**
 * Holds the clicked word where the reader last saw it. The word's offset
 * from the top of `scroller` is recorded on the click and on every scroll;
 * when `content` reflows (a dock opens or is dragged wider, the frame
 * narrows) the text scrolls so the word is back at that offset. `covered`
 * is the height a bottom sheet hides at the scroller's foot: placing keeps
 * the word above it. A word the reader scrolled out of view is left alone.
 */
export function useKeepWordInView({
	scroller,
	content,
	wordId,
	covered,
	reducedMotion,
}: {
	readonly scroller: HTMLElement | null;
	readonly content: HTMLElement | null;
	readonly wordId: string | null;
	readonly covered: number;
	readonly reducedMotion: boolean;
}) {
	const anchor = useRef<number | null>(null);
	const latest = useRef({ wordId, covered, reducedMotion });
	useEffect(() => {
		latest.current = { wordId, covered, reducedMotion };
	});

	const wordElement = (): HTMLElement | null => {
		const id = latest.current.wordId;
		return id && scroller
			? scroller.querySelector<HTMLElement>(
					`[data-word-id="${CSS.escape(id)}"]`,
				)
			: null;
	};

	const record = (element: HTMLElement | null = wordElement()) => {
		if (!scroller || !element) {
			anchor.current = null;
			return;
		}
		const top =
			element.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top;
		const inView =
			top > -element.offsetHeight && top < scroller.clientHeight;
		anchor.current = inView ? top : null;
	};

	const place = (smooth: boolean) => {
		const element = wordElement();
		if (!scroller || !element || anchor.current === null) return;
		const current =
			element.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top;
		const lowest =
			scroller.clientHeight -
			latest.current.covered -
			margin -
			element.offsetHeight;
		const target = Math.min(
			Math.max(anchor.current, margin),
			Math.max(lowest, margin),
		);
		const delta = current - target;
		if (Math.abs(delta) < 1) return;
		scroller.scrollTo({
			top: scroller.scrollTop + delta,
			behavior:
				smooth && !latest.current.reducedMotion ? "smooth" : "instant",
		});
	};

	const placeRef = useRef(place);
	const recordRef = useRef(record);
	useEffect(() => {
		placeRef.current = place;
		recordRef.current = record;
	});

	useEffect(() => {
		if (!scroller) return;
		const onScroll = () => recordRef.current();
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => scroller.removeEventListener("scroll", onScroll);
	}, [scroller]);

	useEffect(() => {
		if (!content) return;
		const observer = new ResizeObserver(() => placeRef.current(false));
		observer.observe(content);
		return () => observer.disconnect();
	}, [content]);

	// A sheet that opens, snaps or closes changes what is covered.
	useEffect(() => {
		if (covered >= 0) placeRef.current(true);
	}, [covered]);

	return { record };
}
