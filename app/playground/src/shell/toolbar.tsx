import { Button, cn } from "lego";
import {
	ArrowLeftIcon,
	MonitorIcon,
	MoonIcon,
	MoveHorizontalIcon,
	PilcrowLeftIcon,
	PilcrowRightIcon,
	SmartphoneIcon,
	SunIcon,
	TabletIcon,
	TurtleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { hashHref } from "./hash-route";
import { type FrameSettings, widthPresets } from "./settings";

/**
 * The bar above every demo: back to the index, the title, frame settings.
 * One compact row; the demo's description lives in the inspector.
 */
export function Toolbar({
	title,
	settings,
	frameWidth,
	shellParams,
	onChange,
}: {
	readonly title: string;
	readonly settings: FrameSettings;
	/** The frame's measured width, in CSS px. */
	readonly frameWidth: number;
	/** The current toolbar params, so the back link keeps them. */
	readonly shellParams: URLSearchParams;
	readonly onChange: (settings: FrameSettings) => void;
}) {
	const set = (patch: Partial<FrameSettings>) =>
		onChange({ ...settings, ...patch });
	return (
		<header className="dark flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-canvas px-2 py-1 text-sm text-ink">
			<a
				href={hashHref("/", shellParams)}
				aria-label="All demos"
				title="All demos"
				className="grid size-7 place-items-center rounded-md text-ink-soft hover:bg-raised hover:text-ink"
			>
				<ArrowLeftIcon className="size-4" />
			</a>
			<h1 className="min-w-0 flex-1 truncate font-medium">{title}</h1>
			<Group label="Frame width">
				{widthPresets.map((preset) => {
					const Icon = presetIcon(preset.width);
					return (
						<Toggle
							key={preset.label}
							label={preset.label}
							pressed={settings.width === preset.width}
							onClick={() => set({ width: preset.width })}
						>
							<Icon />
							{preset.width === "fill" ? null : preset.width}
						</Toggle>
					);
				})}
				<span className="w-14 text-end font-mono text-xs text-ink-muted tabular-nums">
					{frameWidth}px
				</span>
			</Group>
			<Group label="Frame settings">
				<Toggle
					label="Right-to-left frame"
					pressed={settings.dir === "rtl"}
					onClick={() =>
						set({ dir: settings.dir === "rtl" ? "ltr" : "rtl" })
					}
				>
					{settings.dir === "rtl" ? (
						<PilcrowLeftIcon />
					) : (
						<PilcrowRightIcon />
					)}
					{settings.dir.toUpperCase()}
				</Toggle>
				<Toggle
					label="Light frame"
					pressed={settings.theme === "light"}
					onClick={() =>
						set({
							theme:
								settings.theme === "light" ? "dark" : "light",
						})
					}
				>
					{settings.theme === "light" ? <SunIcon /> : <MoonIcon />}
				</Toggle>
				<Toggle
					label="Reduced motion"
					pressed={settings.reducedMotion}
					onClick={() =>
						set({ reducedMotion: !settings.reducedMotion })
					}
				>
					<TurtleIcon />
				</Toggle>
			</Group>
		</header>
	);
}

function Group({
	label,
	children,
}: {
	readonly label: string;
	readonly children: ReactNode;
}) {
	return (
		<fieldset
			aria-label={label}
			className="flex flex-wrap items-center gap-1"
		>
			{children}
		</fieldset>
	);
}

function presetIcon(width: number | "fill") {
	if (width === "fill") return MoveHorizontalIcon;
	if (width < 600) return SmartphoneIcon;
	if (width < 1200) return TabletIcon;
	return MonitorIcon;
}

/** A pressable setting; `label` names it for assistive tech and on hover. */
function Toggle({
	label,
	pressed,
	onClick,
	children,
}: {
	readonly label: string;
	readonly pressed: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<Button
			size="sm"
			variant={pressed ? "secondary" : "ghost"}
			aria-pressed={pressed}
			aria-label={label}
			title={label}
			onClick={onClick}
			className={cn(!pressed && "text-ink-soft")}
		>
			{children}
		</Button>
	);
}
