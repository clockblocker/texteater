import { Button, cn } from "lego";
import {
	ArrowLeftIcon,
	MoonIcon,
	PilcrowLeftIcon,
	PilcrowRightIcon,
	SunIcon,
	TurtleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { hashHref } from "./hash-route";
import { type FrameSettings, widthPresets } from "./settings";

/** The bar above every demo: back to the index, the title, frame settings. */
export function Toolbar({
	title,
	description,
	settings,
	frameWidth,
	shellParams,
	onChange,
}: {
	readonly title: string;
	readonly description?: string;
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
		<header className="dark flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-canvas px-3 py-2 text-sm text-ink">
			<a
				href={hashHref("/", shellParams)}
				className="flex items-center gap-1 text-ink-soft hover:text-ink"
			>
				<ArrowLeftIcon className="size-4" />
				Demos
			</a>
			<div className="min-w-0 flex-1">
				<h1 className="truncate font-medium">{title}</h1>
				{description ? (
					<p className="truncate text-xs text-ink-muted">
						{description}
					</p>
				) : null}
			</div>
			<Group label="Frame width">
				{widthPresets.map((preset) => (
					<Toggle
						key={preset.label}
						pressed={settings.width === preset.width}
						onClick={() => set({ width: preset.width })}
					>
						{preset.label}
					</Toggle>
				))}
				<span className="w-16 text-end font-mono text-xs text-ink-muted tabular-nums">
					{frameWidth}px
				</span>
			</Group>
			<Group label="Frame settings">
				<Toggle
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
					pressed={settings.theme === "light"}
					onClick={() =>
						set({
							theme:
								settings.theme === "light" ? "dark" : "light",
						})
					}
				>
					{settings.theme === "light" ? <SunIcon /> : <MoonIcon />}
					{settings.theme === "light" ? "Light" : "Dark"}
				</Toggle>
				<Toggle
					pressed={settings.reducedMotion}
					onClick={() =>
						set({ reducedMotion: !settings.reducedMotion })
					}
				>
					<TurtleIcon />
					Reduced motion
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

function Toggle({
	pressed,
	onClick,
	children,
}: {
	readonly pressed: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<Button
			size="sm"
			variant={pressed ? "secondary" : "ghost"}
			aria-pressed={pressed}
			onClick={onClick}
			className={cn(!pressed && "text-ink-soft")}
		>
			{children}
		</Button>
	);
}
