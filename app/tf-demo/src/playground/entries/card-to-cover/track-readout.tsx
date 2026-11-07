import { useState } from "react";
import { InspectorSection } from "../inspector";
import { type Recorder, type Track, useLastTrack } from "./recorder";
import {
	type Box,
	boxOvershoot,
	frameStats,
	maxScaleOff,
	partDrift,
	partVerdict,
	resizingFrames,
} from "./track";

/** The parts both forms share: the ones whose path is judged. */
const SHARED = ["heading", "contexts", "lines"] as const;

const px = (value: number) => value.toFixed(1);
const at = (box: Box | null | undefined) =>
	box ? `${px(box.x)}, ${px(box.y)}` : "–";

function Row({
	name,
	value,
}: {
	readonly name: string;
	readonly value: string;
}) {
	return (
		<>
			<dt className="text-ink-muted">{name}</dt>
			<dd
				data-readout={name}
				className="font-mono text-[0.7rem] text-ink"
			>
				{value}
			</dd>
		</>
	);
}

/** Where `part`'s new place was measured the last time in `track`. */
function lastMeasured(track: Track, part: string): Box | undefined {
	return [...track.measured].reverse().find((entry) => entry.part === part)
		?.box;
}

/**
 * The last open or close, sampled every frame: whether the box resized and
 * never scaled or overshot, how long its frames took, and for each shared
 * part whether its path in the box is smooth and keeps to the box's
 * progress, where it rests, and where its new place was measured at the
 * change of form.
 */
export function TrackReadout({ recorder }: { readonly recorder: Recorder }) {
	const track = useLastTrack(recorder);
	const [copied, setCopied] = useState(false);
	if (!track)
		return (
			<InspectorSection title="Last move">
				<p className="text-xs text-ink-muted">
					Open a Card to sample its parts every frame.
				</p>
			</InspectorSection>
		);
	const stats = frameStats(track.frames);
	const over = boxOvershoot(track.frames);
	return (
		<InspectorSection title={`Last ${track.kind} · ${track.id}`}>
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
				<Row
					name="box"
					value={`resized over ${resizingFrames(track.frames).toString()} frames · scale off 1 by ${maxScaleOff(track.frames).toFixed(3)}`}
				/>
				<Row
					name="overshoot"
					value={`w ${px(over.w)} · h ${px(over.h)} · x ${px(over.x)} · y ${px(over.y)} px`}
				/>
				<Row
					name="frames"
					value={`${stats.frames.toString()} · mean ${stats.mean.toFixed(1)} ms · p95 ${stats.p95.toFixed(1)} · max ${stats.max.toFixed(1)} · dropped ${stats.dropped.toString()}`}
				/>
				{SHARED.map((part) => {
					const verdict = partVerdict(track.frames, part);
					const jumps = verdict.jumps.length;
					return (
						<Row
							key={part}
							name={part}
							value={`${jumps === 0 ? "smooth" : `${jumps.toString()} jump${jumps === 1 ? "" : "s"} (frame ${verdict.jumps.join(", ")})`} · drifts ${px(partDrift(track.frames, part))} px off the box's progress · moved ${verdict.moving.toString()} frames · max step ${px(verdict.maxStep)} px · rests at ${at(verdict.end)} · measured ${at(lastMeasured(track, part))}`}
						/>
					);
				})}
			</dl>
			<div>
				<button
					type="button"
					className="cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={() => {
						void navigator.clipboard
							.writeText(JSON.stringify(track))
							.then(() => setCopied(true));
					}}
				>
					{copied ? "Copied" : "Copy samples"}
				</button>
			</div>
		</InspectorSection>
	);
}
