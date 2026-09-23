import { useEffect, useMemo, useState } from "react";
import {
	type ChannelSummary,
	durationOf,
	frameIntervalOf,
	partition,
	type Recording,
	summarize,
} from "./trace";

const button =
	"rounded-md border border-line px-2 py-1 font-mono text-[0.65rem] text-ink-muted hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-link disabled:opacity-40";
const cell = "px-1.5 py-0.5 text-end tabular-nums";

function ms(value: number | null): string {
	return value === null ? "·" : `${Math.round(value).toString()}`;
}

function measure(value: number, property: string): string {
	return property === "opacity"
		? value.toFixed(2)
		: Math.round(value).toString();
}

/** A tick every 100 ms, thinned so the axis never shows more than eight. */
function ticks(duration: number): number[] {
	const step = 100 * Math.ceil(duration / 800);
	const out: number[] = [];
	for (let t = 0; t <= duration; t += step) out.push(t);
	return out;
}

function Lane({
	summary,
	from,
	span,
}: {
	summary: ChannelSummary;
	from: number;
	span: number;
}) {
	const range = summary.max - summary.min || 1;
	const points = summary.points
		.map(([t, value]) => {
			const x = (((t - from) / span) * 1000).toFixed(1);
			const y = (((summary.max - value) / range) * 100).toFixed(1);
			return `${x},${y}`;
		})
		.join(" ");
	return (
		<svg
			role="img"
			aria-label={`${summary.element} ${summary.property}`}
			viewBox="0 0 1000 100"
			preserveAspectRatio="none"
			className="h-4 w-full overflow-visible text-link"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

/**
 * One recording of a specimen: every channel that moved, drawn on a
 * shared millisecond axis, with the inputs that reached the specimen as
 * vertical rules, and the numbers under it. Time is from the recording's
 * origin: the first input, or the last still frame.
 */
export function TraceView({
	recordings,
	onClear,
}: {
	recordings: readonly Recording[];
	onClear: () => void;
}) {
	/* the newest recording shows unless the reader stepped back */
	const [pinned, setPinned] = useState<number | null>(null);
	const newest = recordings.at(-1);
	useEffect(() => {
		if (newest) setPinned(null);
	}, [newest]);
	const index = Math.min(
		pinned ?? recordings.length - 1,
		recordings.length - 1,
	);
	const recording = recordings[index];
	const summaries = useMemo(
		() => (recording ? summarize(recording) : []),
		[recording],
	);
	const { moving, presence } = useMemo(
		() => partition(summaries),
		[summaries],
	);
	if (!recording)
		return (
			<p className="font-mono text-[0.65rem] leading-relaxed text-ink-muted">
				Nothing recorded yet. Every input on the specimen and every
				frame in which something moves is kept; the recording closes
				after 300 ms of stillness.
			</p>
		);
	const first = recording.frames[0]?.t ?? 0;
	const duration = durationOf(recording);
	const span = duration || 1;
	const interval = frameIntervalOf(recording);
	const at = (t: number) => `${(((t - first) / span) * 100).toString()}%`;
	const copy = () => {
		void navigator.clipboard?.writeText(
			JSON.stringify(
				{
					markers: recording.markers,
					channels: summaries,
				},
				null,
				"\t",
			),
		);
	};
	return (
		<div data-trace-view="" className="space-y-3">
			<div className="flex flex-wrap items-center gap-2 font-mono text-[0.65rem] text-ink-muted">
				<button
					type="button"
					className={button}
					aria-label="Earlier recording"
					disabled={index <= 0}
					onClick={() => setPinned(index - 1)}
				>
					‹
				</button>
				<span className="tabular-nums">
					{(index + 1).toString()}/{recordings.length.toString()}
				</span>
				<button
					type="button"
					className={button}
					aria-label="Later recording"
					disabled={index >= recordings.length - 1}
					onClick={() => setPinned(index + 1)}
				>
					›
				</button>
				<span className="tabular-nums">
					{Math.round(duration).toString()} ms ·{" "}
					{recording.frames.length.toString()} frames
					{interval === null
						? ""
						: ` · ${interval.toFixed(1)} ms/frame`}
				</span>
				<button
					type="button"
					className={`${button} ms-auto`}
					onClick={copy}
				>
					Copy JSON
				</button>
				<button type="button" className={button} onClick={onClear}>
					Clear
				</button>
			</div>
			<div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-2 gap-y-1">
				<span />
				<div className="relative h-3 font-mono text-[0.6rem] text-ink-faint">
					{ticks(duration).map((t) => (
						<span
							key={t}
							className="absolute -translate-x-1/2 tabular-nums"
							style={{ left: at(first + t) }}
						>
							{t.toString()}
						</span>
					))}
				</div>
				{moving.map((summary) => (
					<div key={summary.key} className="contents">
						<span
							className="truncate font-mono text-[0.65rem] text-ink-muted"
							title={summary.key}
						>
							{summary.element}{" "}
							<span className="text-ink-faint">
								{summary.property}
							</span>
						</span>
						<div className="relative border-b border-line">
							{recording.markers.map((marker, nth) => (
								<span
									key={`${marker.label}-${nth.toString()}`}
									aria-hidden="true"
									className="absolute inset-y-0 border-s border-dashed border-ink-faint"
									style={{ left: at(marker.t) }}
								/>
							))}
							{summary.appears !== null ? (
								<span
									aria-hidden="true"
									className="absolute inset-y-0 start-0 bg-raised"
									style={{ width: at(summary.appears) }}
								/>
							) : null}
							<Lane summary={summary} from={first} span={span} />
						</div>
					</div>
				))}
			</div>
			<ul className="flex flex-wrap gap-x-3 font-mono text-[0.65rem] text-ink-muted">
				{recording.markers.map((marker, nth) => (
					<li
						key={`${marker.label}-${nth.toString()}`}
						className="tabular-nums"
					>
						{marker.label}{" "}
						<span className="text-ink">{ms(marker.t)} ms</span>
					</li>
				))}
			</ul>
			<table className="w-full border-collapse font-mono text-[0.65rem] text-ink">
				<thead className="text-ink-muted">
					<tr>
						<th className="px-1.5 py-0.5 text-start font-normal">
							channel
						</th>
						<th className={`${cell} font-normal`}>appears</th>
						<th className={`${cell} font-normal`}>starts</th>
						<th className={`${cell} font-normal`}>settles</th>
						<th className={`${cell} font-normal`}>from</th>
						<th className={`${cell} font-normal`}>to</th>
					</tr>
				</thead>
				<tbody>
					{moving.map((summary) => (
						<tr
							key={summary.key}
							data-trace-channel={summary.key}
							className="border-t border-line"
						>
							<td
								className="max-w-[9rem] truncate px-1.5 py-0.5"
								title={summary.key}
							>
								{summary.element}{" "}
								<span className="text-ink-muted">
									{summary.property}
								</span>
							</td>
							<td className={`${cell} text-ink-muted`}>
								{ms(summary.appears)}
							</td>
							<td className={cell}>{ms(summary.starts)}</td>
							<td className={cell}>
								{summary.leaves !== null
									? `left ${ms(summary.leaves)}`
									: ms(summary.settles)}
							</td>
							<td className={`${cell} text-ink-muted`}>
								{measure(summary.from, summary.property)}
							</td>
							<td className={cell}>
								{measure(summary.to, summary.property)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{presence.length > 0 ? (
				<ul
					aria-label="Comings and goings"
					className="space-y-0.5 font-mono text-[0.65rem] text-ink-muted"
				>
					{presence.map((item) => (
						<li
							key={item.element}
							data-trace-presence={item.element}
							className="tabular-nums"
						>
							{item.element}
							{item.appears !== null ? (
								<>
									{" "}
									appears{" "}
									<span className="text-ink">
										{ms(item.appears)} ms
									</span>
								</>
							) : null}
							{item.leaves !== null ? (
								<>
									{" "}
									leaves{" "}
									<span className="text-ink">
										{ms(item.leaves)} ms
									</span>
								</>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
