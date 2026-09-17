import { useMemo } from "react";

import { catalogTimings, type Entry, SECTIONS, type Timing } from "./catalog";
import { LABEL } from "./controls";

/**
 * THE SCORE — every animation in tf-demo on one millisecond axis.
 *
 * A bar is an animation's timeline drawn to the same scale as every other,
 * so two durations can be compared by eye; its ticks are the instants the
 * frame function actually does something, derived in `keyframes.ts` and
 * declared nowhere. A tick that stands proud of the bar is a turn: the
 * peak of a pulse, the top of an arc.
 *
 * Blue is motion that ships in the main app; ink is a playground
 * prototype. Picking a row opens it alone on the stage.
 */

/** Axis ticks every 500 ms, up to the longest animation. */
function axisTicks(max: number): readonly number[] {
	const out: number[] = [];
	for (let at = 0; at <= max; at += 500) out.push(at);
	return out;
}

const GRID =
	"grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-4 md:grid-cols-[11rem_minmax(6rem,1fr)_minmax(12rem,30rem)_4rem]";

function Strip({
	timing,
	max,
	ships,
}: {
	timing: Timing;
	max: number;
	ships: boolean;
}) {
	const width = `${((timing.length / max) * 100).toFixed(3)}%`;
	return (
		<div aria-hidden="true" className="col-span-2 h-4 md:col-span-1">
			<div
				className={`relative h-full min-w-px rounded-[0.15rem] border ${ships ? "border-link bg-link/20 group-hover:bg-link/35" : "border-line-strong group-hover:border-ink-muted group-hover:bg-ink-faint/15"}`}
				style={{ width }}
			>
				{timing.keys.map((key) => {
					const turns = key.hits.some((hit) => hit.event === "peak");
					return (
						<span
							key={key.at}
							className={`absolute w-px ${turns ? "-top-1 h-5" : "top-0 h-full"} ${ships ? "bg-link" : "bg-ink-muted"}`}
							style={{
								insetInlineStart: `${((key.at / Math.max(timing.length, 1)) * 100).toFixed(3)}%`,
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}

function EntryRow({
	entry,
	timing,
	max,
	onOpen,
}: {
	entry: Entry;
	timing: Timing;
	max: number;
	onOpen: () => void;
}) {
	const ships = entry.where === "main app";
	return (
		<button
			type="button"
			data-entry={entry.key}
			onClick={onOpen}
			aria-label={`${entry.title}, ${Math.round(timing.length).toString()} milliseconds, ${entry.where}`}
			className={`${GRID} w-full gap-y-1.5 rounded-[0.4rem] px-3 py-2 text-start group hover:bg-paper focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none`}
		>
			<span className="truncate text-[0.82rem] text-ink-soft group-hover:text-ink">
				{entry.title}
			</span>
			<span className="text-end font-mono text-[0.68rem] text-ink-faint tabular-nums group-hover:text-ink-muted md:order-last">
				{Math.round(timing.length).toString()}
			</span>
			<span className="hidden truncate font-mono text-[0.62rem] text-ink-faint md:block">
				{entry.source}
			</span>
			<Strip timing={timing} max={max} ships={ships} />
		</button>
	);
}

export function CatalogView({ onOpen }: { onOpen: (key: string) => void }) {
	const timings = useMemo(() => catalogTimings(), []);
	const max = Math.max(
		1,
		...[...timings.values()].map((timing) => timing.length),
	);
	const count = [...timings.keys()].length;

	return (
		<div className="mx-auto flex min-h-full max-w-[72rem] flex-col gap-6 px-6 py-8">
			<header className={`${GRID} gap-y-2 px-3`}>
				<h2 className="flex items-baseline gap-2 text-[0.95rem] text-ink">
					Animations
					<span className="font-mono text-[0.62rem] text-ink-faint tabular-nums">
						{count.toString()}
					</span>
				</h2>
				<span className="text-end font-mono text-[0.62rem] text-ink-faint tabular-nums md:order-last">
					ms
				</span>
				<p className="col-span-2 flex items-center gap-3 font-mono text-[0.58rem] tracking-[0.14em] text-ink-faint uppercase md:col-span-1">
					<span className="flex items-center gap-1.5">
						<span className="h-2.5 w-5 rounded-[0.1rem] border border-link bg-link/20" />
						main app
					</span>
					<span className="flex items-center gap-1.5">
						<span className="h-2.5 w-5 rounded-[0.1rem] border border-line-strong" />
						playground
					</span>
				</p>
				<div
					aria-hidden="true"
					className="relative col-span-2 h-4 border-b border-line md:col-span-1"
				>
					{axisTicks(max).map((at) => (
						<span
							key={at}
							className="absolute bottom-0 flex flex-col items-start"
							style={{
								insetInlineStart: `${((at / max) * 100).toFixed(3)}%`,
							}}
						>
							<span className="font-mono text-[0.58rem] text-ink-faint tabular-nums">
								{at.toString()}
							</span>
						</span>
					))}
				</div>
			</header>

			<div className="flex flex-col gap-5">
				{SECTIONS.map((section) => (
					<section key={section.title} className="flex flex-col">
						<h3
							className={`${LABEL} border-b border-line px-3 pb-1.5`}
						>
							{section.title}
						</h3>
						{section.entries.map((entry) => {
							const timing = timings.get(entry.key);
							if (!timing) return null;
							return (
								<EntryRow
									key={entry.key}
									entry={entry}
									timing={timing}
									max={max}
									onOpen={() => onOpen(entry.key)}
								/>
							);
						})}
					</section>
				))}
			</div>
		</div>
	);
}
