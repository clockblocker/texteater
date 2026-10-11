import { type ReactNode, useState } from "react";
import { useElementSize } from "./env";
import { Frame } from "./frame";
import { setHashParams, shellParamNames, useHashLocation } from "./hash-route";
import {
	Inspector,
	type InspectorAvoid,
	InspectorSlotProvider,
	inspectorPlacement,
	inspectorWidth,
	useInspectorOpen,
} from "./inspector";
import { paramsFromSettings, settingsFromParams } from "./settings";
import { Toolbar } from "./toolbar";

/** The gap between the frame and the docked inspector, in CSS px. */
const inspectorGap = 16;
/** A Fill frame docks the inspector only while it keeps this much width. */
const minFillWidth = 640;

/**
 * A page with the toolbar over a frame, and the inspector in the stage's
 * corner. Frame settings live in the URL.
 */
export function DemoShell({
	title,
	description,
	inspiration,
	children,
}: {
	readonly title: string;
	readonly description?: string;
	readonly inspiration?: readonly string[];
	readonly children: ReactNode;
}) {
	const { params } = useHashLocation();
	const settings = settingsFromParams(params);
	const [frame, setFrame] = useState<HTMLElement | null>(null);
	const [stage, setStage] = useState<HTMLElement | null>(null);
	const [slot, setSlot] = useState<HTMLElement | null>(null);
	const [inspectorOpen, setInspectorOpen] = useInspectorOpen();
	const [avoid, setAvoid] = useState<InspectorAvoid | null>(null);
	const { inlineSize } = useElementSize(frame);
	const stageWidth = useElementSize(stage).inlineSize;

	// Docked, the stage keeps the panel's column free beside the frame, on
	// the side away from the demo's lookup, so the panel never covers the
	// frame; without the room for that, it floats over the frame's far side.
	const reserve = inspectorWidth + inspectorGap + 16;
	const room = stageWidth - 16 - reserve;
	const docked =
		inspectorOpen &&
		stageWidth > 0 &&
		room >= (settings.width === "fill" ? minFillWidth : settings.width);
	const placement = inspectorPlacement(avoid, settings.dir);

	return (
		<div className="flex h-dvh flex-col">
			<Toolbar
				title={title}
				settings={settings}
				frameWidth={inlineSize}
				shellParams={shellParams(params)}
				onChange={(next) => setHashParams(paramsFromSettings(next))}
			/>
			<div ref={setStage} className="relative flex min-h-0 flex-1">
				<InspectorSlotProvider slot={slot} setAvoid={setAvoid}>
					<Frame
						settings={settings}
						reserve={
							docked
								? { side: placement.side, px: reserve - 16 }
								: undefined
						}
						onFrame={setFrame}
						onResize={(width) =>
							setHashParams(
								paramsFromSettings({ ...settings, width }),
							)
						}
					>
						{children}
					</Frame>
				</InspectorSlotProvider>
				<Inspector
					placement={
						docked ? { ...placement, edge: "bottom" } : placement
					}
					open={inspectorOpen}
					onOpenChange={setInspectorOpen}
					title={title}
					description={description}
					inspiration={inspiration}
					onSlot={setSlot}
				/>
			</div>
		</div>
	);
}

/** Only the toolbar's params, for links that leave a demo's own state. */
export function shellParams(params: URLSearchParams): URLSearchParams {
	return new URLSearchParams(
		[...params].filter(([name]) => shellParamNames.includes(name)),
	);
}
