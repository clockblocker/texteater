import { convexQuery } from "@convex-dev/react-query";
import { type UseQueryResult, useQueries } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { api } from "../../convex/_generated/api";

/**
 * A book Scroll read a page at a time (#1212): its Folios, as
 * `scrollViews.get` lists them in `pages`. The reader loads the page it
 * opens at, then the pages before and after as the Learner scrolls toward
 * them, and keeps the Sentences in view still while a page goes in above.
 * A Scroll with no pages, a paste or a link, comes whole with `get`.
 */

type SentenceView = NonNullable<
	FunctionReturnType<typeof api.scrollViews.get>
>["sentences"][number];

type Page = { readonly start: number; readonly end: number };

/** How near, in px, the reader comes to the loaded text's edge before the next page loads. */
const LOAD_MARGIN_PX = 1_600;

/**
 * Where a Scroll opens, by Sentence position: where Go to source lands
 * when `focusing`, else, on a Ground, where this Visitor left it, else its
 * start. Null until known. The saved position is asked of the server,
 * since a cached answer may predate the last save.
 */
export function useStartPosition({
	scrollId,
	visitorId,
	ground,
	focusing,
	focusPosition,
}: {
	readonly scrollId: string;
	readonly visitorId: string;
	readonly ground: boolean;
	/** Go to source is landing somewhere: it wins over the saved position. */
	readonly focusing: boolean;
	/** Where it lands: undefined while looked up, null when it lands nowhere. */
	readonly focusPosition: number | null | undefined;
}): number | null {
	const convex = useConvex();
	const asksSaved = ground && !focusing;
	const [saved, setSaved] = useState<{
		readonly scrollId: string;
		readonly position: number;
	} | null>(null);
	useEffect(() => {
		if (!asksSaved) return;
		let cancelled = false;
		convex.query(api.library.progress, { scrollId, visitorId }).then(
			({ position }) => {
				if (!cancelled) setSaved({ scrollId, position });
			},
			() => {
				// Reading starts at the top when the position cannot be read.
				if (!cancelled) setSaved({ scrollId, position: 0 });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [convex, asksSaved, scrollId, visitorId]);
	if (focusing)
		return focusPosition === undefined ? null : (focusPosition ?? 0);
	if (!ground) return 0;
	return saved?.scrollId === scrollId ? saved.position : null;
}

/** A book Scroll's loaded pages, as `useScrollPages` hands them out. */
export type ScrollPages = {
	/** The loaded pages' Sentences in order; null until the first page is in. */
	readonly sentences: readonly SentenceView[] | null;
	readonly hasPrevious: boolean;
	readonly hasNext: boolean;
	readonly loadPrevious: () => void;
	readonly loadNext: () => void;
	readonly error: Error | null;
};

/** The loaded pages: the indices of the first and last in `pages`. */
type Loaded = {
	readonly scrollId: string;
	readonly first: number;
	readonly last: number;
};

/** The page holding `position`; the last one for a position past them all. */
function pageAt(pages: readonly Page[], position: number): number {
	const index = pages.findIndex(({ end }) => position < end);
	return index === -1 ? pages.length - 1 : index;
}

function combinePages(results: UseQueryResult<SentenceView[] | null>[]) {
	return {
		datas: results.map(({ data }) => data),
		error: results.find(({ error }) => error)?.error ?? null,
	};
}

/**
 * Loads a book Scroll's pages from the one holding `startPosition`. A
 * page before or after loads once the page at that edge is in, so the
 * loaded pages stay one run. Null for a Scroll with no pages.
 */
export function useScrollPages({
	scrollId,
	visitorId,
	pages,
	startPosition,
}: {
	readonly scrollId: string;
	readonly visitorId: string;
	readonly pages: readonly Page[] | undefined;
	readonly startPosition: number | null;
}): ScrollPages | null {
	const [loaded, setLoaded] = useState<Loaded | null>(null);
	const count = pages?.length ?? 0;
	const current: Loaded | null =
		loaded?.scrollId === scrollId
			? loaded
			: pages && count > 0 && startPosition !== null
				? {
						scrollId,
						first: pageAt(pages, startPosition),
						last: pageAt(pages, startPosition),
					}
				: null;
	const shown =
		current && pages ? pages.slice(current.first, current.last + 1) : [];
	const { datas, error } = useQueries({
		queries: shown.map(({ start, end }) =>
			convexQuery(api.scrollViews.page, {
				scrollId,
				visitorId,
				start,
				end,
			}),
		),
		combine: combinePages,
	});
	/* the latest state, for loaders that keep their identity */
	const latest = useRef({ current, count, datas });
	latest.current = { current, count, datas };
	const loadPrevious = useCallback(() => {
		const { current, datas } = latest.current;
		if (!current || current.first === 0 || datas[0] === undefined) return;
		setLoaded({ ...current, first: current.first - 1 });
	}, []);
	const loadNext = useCallback(() => {
		const { current, count, datas } = latest.current;
		if (!current || current.last >= count - 1 || datas.at(-1) === undefined)
			return;
		setLoaded({ ...current, last: current.last + 1 });
	}, []);
	/* `datas` keeps its identity until a page's answer changes */
	const sentences = useMemo(
		() =>
			datas.some((data) => data !== undefined)
				? datas.flatMap((data) => data ?? [])
				: null,
		[datas],
	);
	if (!pages) return null;
	return {
		sentences,
		hasPrevious: current !== null && current.first > 0,
		hasNext: current !== null && current.last < count - 1,
		loadPrevious,
		loadNext,
		error,
	};
}

/** The first Sentence in view, and where its top is, to hold it there. */
function sentenceInView(
	article: HTMLElement,
	scroller: HTMLElement,
): { readonly sentenceId: string; readonly top: number } | null {
	const viewTop = scroller.getBoundingClientRect().top;
	for (const element of article.querySelectorAll<HTMLElement>(
		"[data-sentence]",
	)) {
		const box = element.getBoundingClientRect();
		if (box.bottom > viewTop && element.dataset.sentence)
			return { sentenceId: element.dataset.sentence, top: box.top };
	}
	return null;
}

/**
 * Scrolling through a book's pages: the next page loads when the reader
 * comes within `LOAD_MARGIN_PX` of the loaded text's edge, and a page put
 * in above keeps the Sentences in view where they were. The reader's own
 * scroll anchoring is off (`overflow-anchor: none`), so only this moves it.
 */
export function usePagedScrolling(
	article: RefObject<HTMLElement | null>,
	pages: ScrollPages | null,
): void {
	const sentences = pages?.sentences ?? null;
	const firstId = sentences?.[0]?.sentenceId ?? null;
	/* the Sentence in view before a page went in above, read in render,
	   before React changes the page */
	const renderedFirst = useRef(firstId);
	const held = useRef<ReturnType<typeof sentenceInView>>(null);
	if (renderedFirst.current !== firstId) {
		const scroller =
			article.current?.closest<HTMLElement>("[data-scroller]");
		held.current =
			article.current && scroller
				? sentenceInView(article.current, scroller)
				: null;
		renderedFirst.current = firstId;
	}
	useLayoutEffect(() => {
		const kept = held.current;
		held.current = null;
		if (!kept || firstId === null) return;
		const element = article.current?.querySelector<HTMLElement>(
			`[data-sentence="${kept.sentenceId}"]`,
		);
		const scroller = element?.closest<HTMLElement>("[data-scroller]");
		if (element && scroller)
			scroller.scrollTop +=
				element.getBoundingClientRect().top - kept.top;
	}, [article, firstId]);

	const hasPrevious = pages?.hasPrevious ?? false;
	const hasNext = pages?.hasNext ?? false;
	const loadPrevious = pages?.loadPrevious;
	const loadNext = pages?.loadNext;
	const sentenceCount = sentences?.length ?? 0;
	useEffect(() => {
		const scroller =
			article.current?.closest<HTMLElement>("[data-scroller]");
		if (!scroller || sentenceCount === 0) return;
		let frame = 0;
		const check = () => {
			frame = 0;
			const elements =
				article.current?.querySelectorAll<HTMLElement>(
					"[data-sentence]",
				) ?? [];
			const first = elements[0];
			const last = elements[elements.length - 1];
			if (!first || !last) return;
			const view = scroller.getBoundingClientRect();
			if (
				hasPrevious &&
				view.top - first.getBoundingClientRect().top < LOAD_MARGIN_PX
			)
				loadPrevious?.();
			if (
				hasNext &&
				last.getBoundingClientRect().bottom - view.bottom <
					LOAD_MARGIN_PX
			)
				loadNext?.();
		};
		const onScroll = () => {
			if (frame === 0) frame = window.requestAnimationFrame(check);
		};
		check();
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.cancelAnimationFrame(frame);
			scroller.removeEventListener("scroll", onScroll);
		};
	}, [article, hasPrevious, hasNext, loadPrevious, loadNext, sentenceCount]);
}
