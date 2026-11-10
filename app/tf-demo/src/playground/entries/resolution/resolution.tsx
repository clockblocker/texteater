import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntryRoute } from "../../playground-router";
import { createFakeConvex, type SessionEvent } from "./fake-convex";
import { DEFAULT_KNOBS, type Knobs, type Variant } from "./knobs";
import { ProposedStage } from "./proposed";
import { ResolutionInspector } from "./resolution-inspector";
import { clickStoryWord } from "./story-text";
import { TodayStage } from "./today";

/**
 * How a click's Deck feels while its meaning resolves (#1332): a short
 * German text and the Deck a click deals, played by Today's real flow or
 * by Proposed on the tabletop battery, over a fake Resolution Session. The
 * surface shows only the text and the Deck; every knob is in the
 * inspector (playground ADR 0001).
 *
 * The variant is the route: `/playground/resolution/<today|proposed>`.
 */
export function ResolutionEntry({ route }: { readonly route: EntryRoute }) {
	const variant: Variant =
		route.segments[0] === "today" ? "today" : "proposed";
	const [knobs, setKnobs] = useState<Knobs>(DEFAULT_KNOBS);
	const latest = useRef(knobs);
	latest.current = knobs;
	/** A fresh stage per replay, so nothing outlives the Deck it was dealt for. */
	const [run, setRun] = useState(0);
	const surface = useRef<HTMLDivElement>(null);
	const report = useCallback(({ story, state }: SessionEvent) => {
		const element = surface.current;
		if (!element) return;
		element.dataset.sessionStory = story.key;
		element.dataset.sessionPhase = state.phase;
	}, []);
	const backend = useMemo(
		() =>
			createFakeConvex({
				plan: () => latest.current,
				timeScale: () => latest.current.timeScale,
				onState: report,
			}),
		[report],
	);
	/** The story a replay clicks once its stage has mounted. */
	const pending = useRef<string | null>(null);
	const replay = useCallback(
		(story: string = latest.current.story) => {
			backend.reset();
			const element = surface.current;
			if (element) {
				delete element.dataset.sessionStory;
				delete element.dataset.sessionPhase;
			}
			pending.current = story;
			setRun((value) => value + 1);
		},
		[backend],
	);
	useEffect(() => {
		const story = pending.current;
		if (!story) return;
		pending.current = null;
		return clickStoryWord(surface, story);
	}, [run, variant]);
	const setVariant = useCallback(
		(next: Variant) => route.setSegments([next]),
		[route.setSegments],
	);
	const onKnobs = useCallback(
		(next: Knobs) => {
			const picked = next.story !== latest.current.story;
			latest.current = next;
			setKnobs(next);
			if (picked) replay(next.story);
		},
		[replay],
	);
	return (
		<>
			<div className="flex h-full min-h-0 p-4 lg:pe-[23rem]">
				<div
					ref={surface}
					data-resolution-surface={variant}
					dir={knobs.rtl ? "rtl" : "ltr"}
					className="relative flex min-h-[36rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[0.7rem] border border-line bg-canvas"
				>
					{variant === "today" ? (
						<TodayStage
							key={run}
							backend={backend}
							durationScale={1 / knobs.timeScale}
						/>
					) : (
						<ProposedStage
							key={run}
							knobs={knobs}
							onState={report}
						/>
					)}
				</div>
			</div>
			<ResolutionInspector
				variant={variant}
				knobs={knobs}
				onVariant={setVariant}
				onKnobs={onKnobs}
				onReplay={replay}
			/>
		</>
	);
}
