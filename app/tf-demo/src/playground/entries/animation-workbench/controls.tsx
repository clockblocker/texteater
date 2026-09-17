import type { LucideIcon } from "lucide-react";
import { RotateCcwIcon } from "lucide-react";
import type { Keyframe, Keyframes } from "./keyframes";
import { describeHits, formatSample, keyAt } from "./keyframes";

/**
 * The workbench's chrome, in one voice: monospace, small, tabular. The
 * specimen on stage is the only thing drawn in the app's own typefaces, so
 * an instrument mark is never mistaken for the thing being measured.
 */

export const LABEL =
	"font-mono text-[0.58rem] tracking-[0.14em] uppercase text-ink-muted";
export const VALUE = "font-mono text-[0.68rem] tabular-nums text-ink";

export function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid min-h-7 grid-cols-[4.75rem_1fr] items-center gap-3">
			<span className={LABEL}>{label}</span>
			<div className="flex min-w-0 items-center gap-1.5">{children}</div>
		</div>
	);
}

export function IconButton({
	icon: Icon,
	label,
	onClick,
	disabled,
	pressed,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	disabled?: boolean;
	pressed?: boolean;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={pressed}
			disabled={disabled}
			onClick={onClick}
			className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] border border-line text-ink-soft hover:border-link hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft aria-pressed:border-link aria-pressed:text-link"
		>
			<Icon size={13} strokeWidth={1.75} />
		</button>
	);
}

export function TextButton({
	children,
	onClick,
	disabled,
	title,
}: {
	children: string;
	onClick: () => void;
	disabled?: boolean;
	title?: string;
}) {
	return (
		<button
			type="button"
			title={title}
			disabled={disabled}
			onClick={onClick}
			className="h-7 shrink-0 rounded-[0.35rem] border border-line px-2 font-mono text-[0.62rem] tracking-[0.06em] text-ink-soft uppercase hover:border-link hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft"
		>
			{children}
		</button>
	);
}

export function Chip({
	children,
	pressed,
	onClick,
}: {
	children: string;
	pressed: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			className="h-6 min-w-7 rounded-[0.3rem] px-1.5 font-mono text-[0.68rem] text-ink-muted tabular-nums hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none aria-pressed:bg-raised aria-pressed:text-link"
		>
			{children}
		</button>
	);
}

export function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<label className="flex h-7 cursor-pointer items-center gap-2 font-mono text-[0.68rem] text-ink-soft">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="size-3 accent-link"
			/>
			<span>{label}</span>
		</label>
	);
}

function Reset({
	what,
	disabled,
	onClick,
}: {
	what: string;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={`Reset ${what} to the accepted value`}
			aria-label={`Reset ${what}`}
			className="flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] text-ink-faint hover:text-link focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none disabled:invisible"
		>
			<RotateCcwIcon size={11} strokeWidth={1.75} />
		</button>
	);
}

/**
 * One numeric knob: a slider for feel, a field for exactness, and a reset
 * to the accepted value. `value` is in the unit shown; the caller maps it
 * to and from the spec.
 */
export function Knob({
	label,
	value,
	baseline,
	min,
	max,
	step,
	unit,
	onChange,
}: {
	label: string;
	value: number;
	baseline?: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	onChange: (next: number) => void;
}) {
	const digits = Number.isInteger(step) ? 0 : 1;
	return (
		<Row label={label}>
			<input
				type="range"
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="h-1 min-w-0 flex-1 accent-link"
			/>
			<input
				type="number"
				aria-label={`${label}, exact`}
				min={min}
				max={max}
				step={step}
				value={value.toFixed(digits)}
				onChange={(event) => {
					const next = Number(event.target.value);
					if (Number.isFinite(next)) {
						onChange(Math.max(min, Math.min(max, next)));
					}
				}}
				className={`w-[3.4rem] shrink-0 rounded-[0.25rem] border border-line bg-canvas px-1 py-0.5 text-end ${VALUE}`}
			/>
			<span className="w-4 shrink-0 font-mono text-[0.62rem] text-ink-faint">
				{unit ?? ""}
			</span>
			<Reset
				what={label}
				disabled={baseline === undefined || value === baseline}
				onClick={() => baseline !== undefined && onChange(baseline)}
			/>
		</Row>
	);
}

export function Select<T extends string>({
	label,
	value,
	baseline,
	options,
	onChange,
}: {
	label: string;
	value: T;
	baseline: T;
	options: readonly T[];
	onChange: (next: T) => void;
}) {
	return (
		<Row label={label}>
			<select
				aria-label={label}
				value={value}
				onChange={(event) => onChange(event.target.value as T)}
				className={`min-w-0 flex-1 rounded-[0.25rem] border border-line bg-canvas px-1 py-1 ${VALUE}`}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
			<Reset
				what={label}
				disabled={value === baseline}
				onClick={() => onChange(baseline)}
			/>
		</Row>
	);
}

/* ------------------------------------------------------------- scrubber */

/**
 * The timeline: a scrub bar over the animation's own keys. A tick is an
 * instant something does something; the loop interval, when one is set, is
 * drawn as the band play stays inside.
 */
export function Scrubber({
	t,
	length,
	keys,
	range,
	onSeek,
}: {
	t: number;
	length: number;
	keys: readonly Keyframe[];
	range: { readonly from: number; readonly to: number } | null;
	onSeek: (t: number) => void;
}) {
	const pct = (at: number) =>
		`${((at / Math.max(length, 1)) * 100).toFixed(3)}%`;
	return (
		<div className="flex flex-col gap-0.5">
			<input
				type="range"
				aria-label="Timeline"
				min={0}
				max={Math.max(1, length)}
				step="any"
				value={t}
				disabled={length === 0}
				onChange={(event) => onSeek(Number(event.target.value))}
				className="h-1 w-full accent-link"
			/>
			<div aria-hidden="true" className="relative h-2">
				{range ? (
					<span
						className="absolute inset-y-0 top-1.5 h-px bg-link"
						style={{
							insetInlineStart: pct(range.from),
							width: pct(range.to - range.from),
						}}
					/>
				) : null}
				{keys.map((key) => (
					<span
						key={key.at}
						title={`${describeHits(key.hits) || "Edge"} · ${Math.round(key.at).toString()} ms`}
						className={`absolute top-0 w-px ${key.hits.some((hit) => hit.event === "peak") ? "h-2 bg-ink-soft" : "h-1 bg-ink-faint"}`}
						style={{ insetInlineStart: pct(key.at) }}
					/>
				))}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------ keyframes */

/**
 * The animation's keyframes: channels down, keys across, derived from the
 * very function the stage draws. A column header seeks to that instant;
 * the column the clock is in is lit.
 */
export function KeyframeTable({
	keyframes,
	t,
	onSeek,
}: {
	keyframes: Keyframes;
	t: number;
	onSeek: (t: number) => void;
}) {
	const { channels, keys } = keyframes;
	const current = keyAt(keys, t);
	if (channels.length === 0) {
		return (
			<p
				data-keyframes="still"
				className="font-mono text-[0.62rem] text-ink-faint"
			>
				Nothing moves here.
			</p>
		);
	}
	return (
		<div data-keyframes className="max-h-[11rem] overflow-auto">
			<table className="border-separate border-spacing-0 font-mono text-[0.62rem] tabular-nums">
				<thead>
					<tr>
						<th className="sticky start-0 top-0 z-20 bg-paper pe-2 text-start font-normal text-ink-faint">
							ms
						</th>
						{keys.map((key, index) => (
							<th
								key={key.at}
								data-key={index}
								data-current={index === current || undefined}
								className={`sticky top-0 z-10 px-1.5 pb-0.5 text-end align-bottom font-normal ${index === current ? "rounded-t-[0.3rem] bg-raised" : "bg-paper"}`}
							>
								<button
									type="button"
									onClick={() => onSeek(key.at)}
									title={
										describeHits(key.hits) ||
										"The timeline's edge"
									}
									className={`rounded-[0.25rem] px-0.5 hover:text-link ${index === current ? "font-bold text-ink" : "text-ink-soft"}`}
								>
									{Math.round(key.at).toString()}
								</button>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{channels.map((channel) => (
						<tr key={channel.path}>
							<th className="sticky start-0 z-10 bg-paper pe-2 text-start font-normal whitespace-nowrap text-ink-muted">
								{channel.path}
							</th>
							{keys.map((key, index) => {
								const hit = key.hits.find(
									(one) => one.path === channel.path,
								);
								return (
									<td
										key={key.at}
										title={
											hit
												? describeHits([hit])
												: undefined
										}
										className={`px-1.5 py-px text-end whitespace-nowrap ${index === current ? "bg-raised" : ""} ${hit ? "font-bold text-ink" : "text-ink-faint"}`}
									>
										{formatSample(
											key.values[channel.path] ?? "",
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
