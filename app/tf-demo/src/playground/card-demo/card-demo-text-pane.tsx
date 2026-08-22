import { type ReactNode, useRef, useState } from "react";

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
	const currentWidth = useRef(defaultWidth);

	return (
		<ResizablePanelGroup
			className="card-demo-text-layout"
			id="card-demo-text-layout"
			onLayoutChanged={(_, metadata) => {
				if (!metadata.isUserInteraction) return;
				try {
					window.localStorage.setItem(
						CARD_DEMO_TEXT_PANE_STORAGE_KEY,
						String(Math.round(currentWidth.current)),
					);
				} catch {
					// The pane remains resizable when browser storage is unavailable.
				}
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
					currentWidth.current = inPixels;
				}}
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
