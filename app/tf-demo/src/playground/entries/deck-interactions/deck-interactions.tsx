import { useAtom } from "@effect/atom-react";
import { useQuery } from "@tanstack/react-query";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import { Inspector } from "../inspector";
import { playgroundNotesQuery } from "../playground-note";
import { dealtCards } from "./dealt-cards";
import { InspectorPanel } from "./inspector-panel";
import { readKnobs } from "./knobs";
import type { Frame } from "./layout";
import type { MotionContext } from "./motion-kit";
import { createReadouts } from "./readouts";
import {
	deckInteractionSettingsAtom,
	type Settings,
	settingsOf,
} from "./settings-atoms";
import { variantEntry } from "./variants";
import { useWidth } from "./width";

const TITLE = "Deck interactions";

/** The frame's size, kept current as the window changes. */
function useFrameSize(element: React.RefObject<HTMLDivElement | null>): Frame {
	const [frame, setFrame] = useState<Frame>({ w: 0, h: 0 });
	useLayoutEffect(() => {
		const node = element.current;
		if (!node) return;
		const measure = () =>
			setFrame((current) =>
				current.w === node.clientWidth &&
				current.h === node.clientHeight
					? current
					: { w: node.clientWidth, h: node.clientHeight },
			);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [element]);
	return frame;
}

/** A link in a Card or its Cover leads nowhere here: only the gesture is under study. */
const STAYS: WorkspaceInteraction = {
	follow: () => {},
	presentCards: () => {},
};

/**
 * The Deck-of-Cards interaction prototype: the way to put back, close and
 * open a Card that is in the running, D's swipe actions, behind the
 * variant switch a new contender would join. The Deck is one click's,
 * dealt from the fake db as the app deals it, and each Card is the Note
 * the app shows, drawn by the Presentation foundation. The frame shows
 * only the Deck and what the variant puts on it; the copy, the switches,
 * the knobs and the readouts are in the inspector (playground ADR 0001).
 */
export function DeckInteractions() {
	const snapshot = useQuery(playgroundNotesQuery);
	const cards = useMemo(
		() => (snapshot.data ? dealtCards(snapshot.data, STAYS.follow) : null),
		[snapshot.data],
	);
	const [stored, setStored] = useAtom(deckInteractionSettingsAtom);
	const settings = settingsOf(stored);
	const system = useReducedMotion() ?? false;
	const reduce =
		settings.reducedMotion === "system"
			? system
			: settings.reducedMotion === "on";
	const motion = useMemo<MotionContext>(
		() => ({ reduce, timeScale: settings.timeScale }),
		[reduce, settings.timeScale],
	);
	const [readouts] = useState(createReadouts);
	const [deal, setDeal] = useState(0);
	const frameRef = useRef<HTMLDivElement>(null);
	const frame = useFrameSize(frameRef);
	const width = useWidth(settings.width);
	const entry = variantEntry(settings.variant);
	const storedKnobs = settings.knobs[entry.key];
	const knobs = readKnobs(entry.key, storedKnobs);

	const patch = (next: Partial<Settings>) =>
		setStored({ ...settings, ...next });
	const setKnob = (key: string, value: number | boolean | string) =>
		patch({
			knobs: {
				...settings.knobs,
				[entry.key]: { ...storedKnobs, [key]: value },
			},
		});
	const resetKnobs = () => {
		const { [entry.key]: _dropped, ...rest } = settings.knobs;
		patch({ knobs: rest });
	};

	return (
		<MotionConfig reducedMotion="never">
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<div
					ref={frameRef}
					dir={settings.rtl ? "rtl" : "ltr"}
					data-deck-frame=""
					data-variant={entry.key}
					data-reduced={reduce || undefined}
					data-width={width}
					className="relative min-h-[36rem] flex-1 touch-none overflow-hidden rounded-[0.7rem] border border-line bg-canvas"
				>
					{snapshot.isError ? (
						<p
							className="p-6 text-sm text-destructive"
							role="alert"
						>
							The playground fixtures could not be built. Check
							the Vite terminal and reload.
						</p>
					) : cards?.length === 0 ? (
						<p className="p-6 text-sm text-ink-soft">
							The fake db holds no click to deal.
						</p>
					) : null}
					{frame.w > 0 && cards && cards.length > 0 ? (
						<WorkspaceInteractionProvider
							key={`${entry.key}-${settings.rtl.toString()}-${width}`}
							interaction={STAYS}
						>
							{entry.render(
								{
									cards,
									frame,
									rtl: settings.rtl,
									motion,
									readouts,
									deal,
									width,
								},
								storedKnobs,
							)}
						</WorkspaceInteractionProvider>
					) : null}
				</div>
			</div>
			<Inspector title={TITLE}>
				<InspectorPanel
					settings={settings}
					knobs={knobs}
					readouts={readouts}
					onSettings={(next) => {
						patch(next);
						if (
							next.variant ||
							next.rtl !== undefined ||
							next.width !== undefined
						)
							readouts.set({
								phase: "rest",
								zone: null,
								outcome: null,
							});
					}}
					onKnob={setKnob}
					onResetKnobs={resetKnobs}
					onRedeal={() => setDeal((value) => value + 1)}
				/>
			</Inspector>
		</MotionConfig>
	);
}
