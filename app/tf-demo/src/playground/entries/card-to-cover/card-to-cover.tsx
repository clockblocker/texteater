import { MotionConfig, useReducedMotion } from "motion/react";
import {
	type RefObject,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Frame } from "../deck-interactions/layout";
import type { MotionContext } from "../deck-interactions/motion-kit";
import { Inspector } from "../inspector";
import { CoverPanel } from "./cover-panel";
import { CoverStage } from "./cover-stage";
import { createRecorder } from "./recorder";
import { DEFAULT_SETTINGS, feelOf, type Settings } from "./settings";

const TITLE = "Card to Cover";

/** The frame's size, kept current as the window changes. */
function useFrameSize(element: RefObject<HTMLDivElement | null>): Frame {
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
 * A Card growing into its Cover while its parts change places (#1311),
 * after react-flip-toolkit's StaggeredList: one element whose box resizes
 * on one progress that also carries its parts from where they were drawn
 * to their new places, and whose Cover-only parts fade in after the move. The frame shows only
 * the Deck; the copy, the knobs and the per-frame readouts are in the
 * inspector (playground ADR 0001).
 */
export function CardToCover() {
	const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
	const system = useReducedMotion() ?? false;
	const reduce =
		settings.reducedMotion === "system"
			? system
			: settings.reducedMotion === "on";
	const motion = useMemo<MotionContext>(
		() => ({ reduce, timeScale: settings.timeScale }),
		[reduce, settings.timeScale],
	);
	const feel = useMemo(() => feelOf(settings), [settings]);
	const frameRef = useRef<HTMLDivElement>(null);
	const frame = useFrameSize(frameRef);
	const [recorder] = useState(createRecorder);

	return (
		<MotionConfig reducedMotion="never">
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<div
					ref={frameRef}
					dir={settings.rtl ? "rtl" : "ltr"}
					data-card-to-cover=""
					data-reduced={reduce || undefined}
					className="relative min-h-[36rem] flex-1 overflow-hidden rounded-[0.7rem] border border-line bg-canvas"
				>
					{frame.w > 0 ? (
						<CoverStage
							/* Motion takes a part's `layout` only when it mounts */
							key={`${settings.rtl ? "rtl" : "ltr"}-${settings.clock}`}
							frame={frame}
							rtl={settings.rtl}
							motion={motion}
							feel={feel}
							contain={settings.contain}
							frameRef={frameRef}
							recorder={recorder}
						/>
					) : null}
				</div>
			</div>
			<Inspector title={TITLE}>
				<CoverPanel
					settings={settings}
					recorder={recorder}
					onChange={setSettings}
				/>
			</Inspector>
		</MotionConfig>
	);
}
