import { type ReactNode, useState } from "react";
import { useElementSize } from "./env";
import { Frame } from "./frame";
import { setHashParams, shellParamNames, useHashLocation } from "./hash-route";
import { paramsFromSettings, settingsFromParams } from "./settings";
import { Toolbar } from "./toolbar";

/** A page with the toolbar over a frame. Settings live in the URL. */
export function DemoShell({
	title,
	description,
	children,
}: {
	readonly title: string;
	readonly description?: string;
	readonly children: ReactNode;
}) {
	const { params } = useHashLocation();
	const settings = settingsFromParams(params);
	const [frame, setFrame] = useState<HTMLElement | null>(null);
	const { inlineSize } = useElementSize(frame);
	return (
		<div className="flex h-dvh flex-col">
			<Toolbar
				title={title}
				description={description}
				settings={settings}
				frameWidth={inlineSize}
				shellParams={shellParams(params)}
				onChange={(next) => setHashParams(paramsFromSettings(next))}
			/>
			<Frame
				settings={settings}
				onFrame={setFrame}
				onResize={(width) =>
					setHashParams(paramsFromSettings({ ...settings, width }))
				}
			>
				{children}
			</Frame>
		</div>
	);
}

/** Only the toolbar's params, for links that leave a demo's own state. */
export function shellParams(params: URLSearchParams): URLSearchParams {
	return new URLSearchParams(
		[...params].filter(([name]) => shellParamNames.includes(name)),
	);
}
