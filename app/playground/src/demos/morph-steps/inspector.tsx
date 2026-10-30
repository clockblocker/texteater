import {
	DemoInspector,
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
} from "@/shell";
import { cases, type MorphCase } from "./cases";

/** The design's open choices. */
export type Knobs = {
	/** Plays when the Card opens, or waits for a tap. */
	readonly start: "play" | "tap";
	readonly speed: number;
	/** Rests on the Surface between the stages, or plays straight on. */
	readonly boundary: "pause" | "continue";
	/** Rests on the lemma, or morphs back and plays again. */
	readonly ending: "hold" | "loop";
	/** Keynote's Magic Move "Match": by character or by word. */
	readonly match: "character" | "word";
	readonly captions: boolean;
	readonly tags: boolean;
	/** The sentence's words around the clicked ones, as ghosts. */
	readonly context: boolean;
};

export const initialKnobs: Knobs = {
	start: "play",
	speed: 1,
	boundary: "pause",
	ending: "hold",
	match: "character",
	captions: true,
	tags: true,
	context: true,
};

const speeds = [
	{ value: 0.6, label: "Slow" },
	{ value: 1, label: "Normal" },
	{ value: 1.6, label: "Quick" },
];

/** Everything off the surface: the case, the knobs, and what to try. */
export function MorphInspector({
	morph,
	knobs,
	onKnobs,
	onCase,
}: {
	readonly morph: MorphCase;
	readonly knobs: Knobs;
	readonly onKnobs: (knobs: Knobs) => void;
	readonly onCase: (id: MorphCase["id"]) => void;
}) {
	const set = <Key extends keyof Knobs>(key: Key, value: Knobs[Key]) =>
		onKnobs({ ...knobs, [key]: value });
	return (
		<DemoInspector>
			<InspectorSection>
				<InspectorTry>
					<p>
						The Surface Card shows the clicked words turning into
						the lemma in two stages, after Keynote's Magic Move: a
						word that stays travels to its new place, a part that
						goes fades where it stood, a part that comes fades in
						where it lands.
					</p>
					<p>
						<b>Syntax</b> takes the words on the page to the
						Surface: base order, verb last, each slot as its case (
						<i>jD mit jM zu tun hatte</i>). <b>Inflection</b> takes
						the Surface to the Lemma (<i>mit jM zu tun haben</i>).
						Each step has one caption line; a tag under a word names
						what it is.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Case">
				<InspectorChoice
					label="Sentence"
					options={cases.map((each) => ({
						value: each.id,
						label: each.label,
						hint: each.hint,
					}))}
					value={morph.id}
					onChange={onCase}
				/>
			</InspectorSection>
			<InspectorSection title="Playback">
				<InspectorChoice
					label="When the Card opens"
					options={[
						{ value: "play", label: "Plays by itself" },
						{ value: "tap", label: "Waits for a tap" },
					]}
					value={knobs.start}
					onChange={(value) => set("start", value)}
				/>
				<InspectorChoice
					label="Speed"
					options={speeds}
					value={knobs.speed}
					onChange={(value) => set("speed", value)}
				/>
				<InspectorChoice
					label="At the Surface"
					options={[
						{
							value: "pause",
							label: "Pauses",
							hint: "Play goes on into Inflection",
						},
						{ value: "continue", label: "Plays straight on" },
					]}
					value={knobs.boundary}
					onChange={(value) => set("boundary", value)}
				/>
				<InspectorChoice
					label="At the end"
					options={[
						{ value: "hold", label: "Rests on the lemma" },
						{ value: "loop", label: "Loops" },
					]}
					value={knobs.ending}
					onChange={(value) => set("ending", value)}
				/>
			</InspectorSection>
			<InspectorSection title="Look">
				<InspectorChoice
					label="Match (Magic Move)"
					options={[
						{
							value: "character",
							label: "By letters",
							hint: "hatte → haben keeps ha; only the ending changes",
						},
						{
							value: "word",
							label: "By word",
							hint: "a changed word cross-fades whole",
						},
					]}
					value={knobs.match}
					onChange={(value) => set("match", value)}
				/>
				<InspectorCheck
					checked={knobs.captions}
					onChange={(value) => set("captions", value)}
				>
					Caption line under the words
				</InspectorCheck>
				<InspectorCheck
					checked={knobs.tags}
					onChange={(value) => set("tags", value)}
				>
					Tags under the words (past · 3rd sg)
				</InspectorCheck>
				<InspectorCheck
					checked={knobs.context}
					onChange={(value) => set("context", value)}
				>
					Sentence around the words, as ghosts
				</InspectorCheck>
			</InspectorSection>
			<InspectorSection title="Try">
				<InspectorTry>
					<p>
						Click <i>{morph.clickWord}</i> and watch Syntax play
						out. It rests on the Surface; press Play or tap the
						words to go on into Inflection. Drag along the dots to
						scrub; they are grouped by stage.
					</p>
					<p>
						Switch <i>At the Surface</i> to <i>Plays straight on</i>{" "}
						and ask whether the two stages still read as two. On{" "}
						<i>Kindern</i>, Syntax is one step with nothing to
						rearrange: does it earn its place?
					</p>
					<p>
						Pick <i>Waits for a tap</i> and step through by hand;
						compare <i>By letters</i> with <i>By word</i> on{" "}
						<i>hatte → haben</i> and <i>da → jM</i>.
					</p>
					<p>
						⤢ opens the Card as a Sheet, which lists every step
						under its stage; a step jumps there. The lemma link
						opens the Lemma.
					</p>
					<p>
						Turn on reduced motion in the toolbar: each step then
						lands at once. Compare at 390 and 1440.
					</p>
				</InspectorTry>
			</InspectorSection>
		</DemoInspector>
	);
}
