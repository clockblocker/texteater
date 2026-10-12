import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import { Button } from "lego";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	type GroundPlace,
	useGroundPlace,
} from "@/workspace/workspace-controller";
import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";

/**
 * A Scroll's reading on a Ground (#1192): opening it puts it in progress,
 * the reader resumes at the Sentence it was at, and at its end the Learner
 * marks it done or goes on to the next Scroll, across Section boundaries.
 * A Scroll pushed as a Cover, such as by Go to source, records nothing.
 */

/** How far below the scroller's top a Sentence counts as where the reader is. */
const READING_LINE_PX = 96;
/** Scrolling settles this long before the position is saved. */
const SAVE_DELAY_MS = 800;

type PositionedSentence = {
	readonly sentenceId: string;
	readonly position: number;
};

/**
 * Records the opening, restores the saved position once the Sentences are
 * in, then saves where the reader is as it scrolls. `focused` means Go to
 * source is landing somewhere: it wins over the saved position.
 */
export function useScrollReading({
	scrollId,
	sentences,
	article,
	focused,
}: {
	readonly scrollId: string;
	readonly sentences: readonly PositionedSentence[] | null;
	readonly article: RefObject<HTMLElement | null>;
	readonly focused: boolean;
}): void {
	const { ground } = useGroundPlace();
	const visitorId = useAnonymousVisitorId();
	const open = useMutation(api.library.open);
	const savePosition = useMutation(api.library.savePosition);
	const convex = useConvex();
	const loaded = sentences !== null;

	useEffect(() => {
		if (!ground || !loaded) return;
		open({ scrollId, visitorId }).catch(() => {
			// A Scroll that cannot be read records nothing; the reader says why.
		});
	}, [ground, loaded, open, scrollId, visitorId]);

	/* the saved position, once, before the reader's own scrolling counts;
	   asked of the server, since a cached answer may predate the last save */
	const restored = useRef<string | null>(null);
	useEffect(() => {
		if (!ground || !sentences || restored.current === scrollId) return;
		restored.current = scrollId;
		if (focused) return;
		let frame = 0;
		let settled = false;
		let cancelled = false;
		convex
			.query(api.library.progress, { scrollId, visitorId })
			.then(({ position }) => {
				if (cancelled) return;
				settled = true;
				const sentenceId = sentences.find(
					(sentence) => sentence.position === position,
				)?.sentenceId;
				if (position === 0 || !sentenceId) return;
				frame = window.requestAnimationFrame(() =>
					resumeAt(article.current, sentenceId),
				);
			})
			.catch(() => {
				// Reading starts at the top when the position cannot be read.
			});
		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
			/* a rerun before the answer came asks again */
			if (!settled) restored.current = null;
		};
	}, [ground, sentences, scrollId, visitorId, focused, article, convex]);

	const lastSaved = useRef<number | null>(null);
	useEffect(() => {
		if (!ground || !sentences) return;
		const scroller =
			article.current?.closest<HTMLElement>("[data-scroller]");
		if (!scroller) return;
		const positions = new Map(
			sentences.map(({ sentenceId, position }) => [sentenceId, position]),
		);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const save = () => {
			const line = scroller.getBoundingClientRect().top + READING_LINE_PX;
			const elements =
				article.current?.querySelectorAll<HTMLElement>(
					"[data-sentence]",
				) ?? [];
			const reading = [...elements].find(
				(element) => element.getBoundingClientRect().bottom > line,
			);
			const position = positions.get(reading?.dataset.sentence ?? "");
			if (position === undefined || position === lastSaved.current)
				return;
			lastSaved.current = position;
			savePosition({
				scrollId,
				visitorId,
				position,
			}).catch(() => {
				lastSaved.current = null;
			});
		};
		const onScroll = () => {
			clearTimeout(timer);
			timer = setTimeout(save, SAVE_DELAY_MS);
		};
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			clearTimeout(timer);
			scroller.removeEventListener("scroll", onScroll);
		};
	}, [ground, sentences, article, savePosition, scrollId, visitorId]);
}

/** Scrolls the reader so the Sentence sits on the reading line. */
function resumeAt(article: HTMLElement | null, sentenceId: string): void {
	const element = article?.querySelector<HTMLElement>(
		`[data-sentence="${sentenceId}"]`,
	);
	const scroller = element?.closest<HTMLElement>("[data-scroller]");
	if (!element || !scroller) return;
	scroller.scrollTop +=
		element.getBoundingClientRect().top -
		scroller.getBoundingClientRect().top -
		READING_LINE_PX;
}

/**
 * The foot of a Scroll on a Ground: mark it done, or go on to the next
 * Scroll in Codex order, which marks this one done.
 */
export function ScrollEnd({ scrollId }: { readonly scrollId: string }) {
	const place = useGroundPlace();
	const visitorId = useAnonymousVisitorId();
	const setDone = useMutation(api.library.setDone);
	const progressQuery = useQuery({
		...convexQuery(api.library.progress, { scrollId, visitorId }),
		enabled: place.ground,
	});
	const nextQuery = useQuery({
		...convexQuery(api.library.next, { scrollId }),
		enabled: place.ground,
	});
	if (!place.ground || !progressQuery.data) return null;
	const done = progressQuery.data.status === "Done";
	const next = nextQuery.data ?? null;

	function mark(value: boolean) {
		return setDone({ scrollId, visitorId, done: value });
	}

	return (
		<nav
			aria-label="End of text"
			data-slot="scroll-end"
			className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6"
		>
			<Button
				type="button"
				variant={done ? "secondary" : "outline"}
				aria-pressed={done}
				onClick={() => void mark(!done)}
			>
				{done ? <CheckIcon data-icon="inline-start" /> : null}
				{done ? "Done" : "Mark as done"}
			</Button>
			{next ? (
				<Button
					type="button"
					onClick={() => {
						void mark(true);
						walkToNext(place, next);
					}}
				>
					<span className="max-w-[24ch] truncate">
						Next: {next.title}
					</span>
					<ArrowRightIcon
						data-icon="inline-end"
						className="rtl:-scale-x-100"
					/>
				</Button>
			) : null}
		</nav>
	);
}

type NextScroll = {
	readonly scrollId: string;
	readonly title: string;
	readonly sections: readonly {
		readonly sectionId: string;
		readonly title: string;
	}[];
};

/**
 * Next puts the following Scroll on the Ground with its Sections as the
 * rungs below it: the Sections it shares with this Scroll's line stay, and
 * the rest are walked (tf-demo ADR 0008). A Floating Ground has no line, so
 * the Scroll only replaces it.
 */
function walkToNext(place: GroundPlace, next: NextScroll): void {
	const scroll: WorkspaceTarget = {
		kind: "Scroll",
		scrollId: next.scrollId,
		title: next.title,
	};
	if (!place.line) {
		place.walk(0, [scroll]);
		return;
	}
	const sections = place.line.slice(0, -1);
	let keep = 0;
	while (
		keep < sections.length &&
		keep < next.sections.length &&
		sameSection(sections[keep], next.sections[keep]?.sectionId)
	)
		keep += 1;
	place.walk(keep, [
		...next.sections.slice(keep).map(
			({ sectionId, title }): WorkspaceTarget => ({
				kind: "Section",
				sectionId,
				title,
			}),
		),
		scroll,
	]);
}

function sameSection(
	target: WorkspaceTarget | undefined,
	sectionId: string | undefined,
): boolean {
	return target?.kind === "Section" && target.sectionId === sectionId;
}
