import { useAtom } from "@effect/atom-react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Inspector } from "../inspector";
import { ProjectionDot } from "./deck-cards";
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

/**
 * The Deck-of-Cards interaction prototype: the ways to carry, put back,
 * dismiss and open a Card that are still in the running, behind one
 * switch. The frame shows only the Deck and what a variant puts on the
 * table; the copy, the switches, the knobs and the readouts are in the
 * inspector (playground ADR 0001).
 */
export function DeckInteractions() {
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
					className="relative min-h-[36rem] flex-1 touch-none overflow-hidden rounded-[0.7rem] border border-line bg-canvas"
				>
					{frame.w > 0 ? (
						<Fragment
							key={`${entry.key}-${settings.rtl.toString()}`}
						>
							{entry.render(
								{
									frame,
									rtl: settings.rtl,
									motion,
									readouts,
									deal,
								},
								storedKnobs,
							)}
						</Fragment>
					) : null}
					{settings.showProjection ? (
						<ProjectionDot readouts={readouts} />
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
						if (next.variant || next.rtl !== undefined)
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
