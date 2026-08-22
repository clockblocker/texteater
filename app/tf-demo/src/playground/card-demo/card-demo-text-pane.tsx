import { type ReactNode, useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

const DEFAULT_TEXT_PANE_WIDTH = 864;
export const CARD_DEMO_TEXT_PANE_MIN_WIDTH = 320;
export const CARD_DEMO_TEXT_PANE_STORAGE_KEY =
	"tf-demo:card-playground:text-pane-width";

function persistedTextPaneWidth(): number {
	if (typeof window === "undefined") return DEFAULT_TEXT_PANE_WIDTH;

	try {
		const storedWidth = Number.parseFloat(
			window.localStorage.getItem(CARD_DEMO_TEXT_PANE_STORAGE_KEY) ?? "",
		);
		return Number.isFinite(storedWidth)
			? Math.max(CARD_DEMO_TEXT_PANE_MIN_WIDTH, storedWidth)
			: DEFAULT_TEXT_PANE_WIDTH;
	} catch {
		return DEFAULT_TEXT_PANE_WIDTH;
	}
}

export function CardDemoTextPane({
	children,
}: {
	readonly children: ReactNode;
}) {
	const [defaultWidth] = useState(persistedTextPaneWidth);
	const desiredWidth = useRef(defaultWidth);
	const renderedWidth = useRef(defaultWidth);
	const layoutElement = useRef<HTMLDivElement>(null);
	const textPane = useRef<PanelImperativeHandle>(null);
	const saveFrame = useRef<number | null>(null);

	useEffect(() => {
		const layout = layoutElement.current;
		if (!layout || typeof ResizeObserver === "undefined") return;

		let restoreFrame: number | null = null;
		const resizeObserver = new ResizeObserver(() => {
			if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
			restoreFrame = requestAnimationFrame(() => {
				restoreFrame = null;
				textPane.current?.resize(desiredWidth.current);
			});
		});
		resizeObserver.observe(layout);

		return () => {
			resizeObserver.disconnect();
			if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
			if (saveFrame.current !== null)
				cancelAnimationFrame(saveFrame.current);
		};
	}, []);

	return (
		<ResizablePanelGroup
			className="card-demo-text-layout"
			elementRef={layoutElement}
			id="card-demo-text-layout"
			onLayoutChanged={(_, metadata) => {
				if (!metadata.isUserInteraction) return;
				if (saveFrame.current !== null)
					cancelAnimationFrame(saveFrame.current);
				saveFrame.current = requestAnimationFrame(() => {
					saveFrame.current = null;
					desiredWidth.current =
						textPane.current?.getSize().inPixels ??
						renderedWidth.current;
					try {
						window.localStorage.setItem(
							CARD_DEMO_TEXT_PANE_STORAGE_KEY,
							String(Math.round(desiredWidth.current)),
						);
					} catch {
						// The pane remains resizable when browser storage is unavailable.
					}
				});
			}}
			orientation="horizontal"
			style={{ height: "var(--card-demo-text-layout-height)" }}
		>
			<ResizablePanel
				data-card-demo-text-gutter="left"
				id="card-demo-text-gutter-left"
			/>
			<ResizableHandle
				aria-label="Resize the text pane from the left"
				withHandle
			/>
			<ResizablePanel
				defaultSize={defaultWidth}
				groupResizeBehavior="preserve-pixel-size"
				id="card-demo-text-pane"
				minSize={CARD_DEMO_TEXT_PANE_MIN_WIDTH}
				onResize={({ inPixels }) => {
					renderedWidth.current = inPixels;
				}}
				panelRef={textPane}
			>
				<section aria-label="Fake Text" className="card-demo-text">
					{children}
				</section>
			</ResizablePanel>
			<ResizableHandle
				aria-label="Resize the text pane from the right"
				withHandle
			/>
			<ResizablePanel
				data-card-demo-text-gutter="right"
				id="card-demo-text-gutter-right"
			/>
		</ResizablePanelGroup>
	);
}
