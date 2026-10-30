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
	/** A Card's stage plays when the Card comes in, or waits for a tap. */
	readonly start: "play" | "tap";
	readonly speed: number;
	/** Rests on the form the Card links to, or morphs back and plays again. */
	readonly ending: "hold" | "loop";
	/**
	 * Where Syntax has nothing to rearrange (`Kindern`): open straight on
	 * the Surface Card, or on an Attestation Card with one still line.
	 */
	readonly plain: "skip" | "still";
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
	ending: "hold",
	plain: "skip",
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
						A click deals the Attestation Card, headed by the words
						on the page. Its stage plays <b>Syntax</b>, after
						Keynote's Magic Move: a word that stays travels to its
						new place, a part that goes fades where it stood, a part
						that comes fades in where it lands. It ends on the
						Surface, <i>jD mit jM zu tun hatte</i>, and the route
						under it pushes the Surface Card.
					</p>
					<p>
						The Surface Card is headed by that slotted line. Its
						stage plays <b>Inflection</b> and ends on the Lemma,{" "}
						<i>mit jM zu tun haben</i>; its route pushes the Lemma
						Card. Each Card plays, steps and scrubs on its own; a
						tail brings its Card back to the front.
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
				<InspectorChoice
					label="Nothing for Syntax to do (Kindern)"
					options={[
						{
							value: "skip",
							label: "Open on the Surface Card",
							hint: "no Attestation Card",
						},
						{
							value: "still",
							label: "Still Attestation Card",
							hint: "one line: mit takes the dative",
						},
					]}
					value={knobs.plain}
					onChange={(value) => set("plain", value)}
				/>
			</InspectorSection>
			<InspectorSection title="Playback">
				<InspectorChoice
					label="When a Card comes in"
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
					label="At the end"
					options={[
						{ value: "hold", label: "Rests on the result" },
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
						Click <i>{morph.clickWord}</i> and watch Syntax play out
						on the Attestation Card. It rests on the Surface; follow
						the route under it to push the Surface Card, which plays
						Inflection. Its route pushes the Lemma Card.
					</p>
					<p>
						Click the Attestation Card's tail to go back: it rests
						where you left it. Does the hop between the two Cards
						read as the line between syntax and inflection?
					</p>
					<p>
						On <i>Kindern</i>, Syntax has nothing to rearrange.
						Compare <i>Open on the Surface Card</i> with{" "}
						<i>Still Attestation Card</i>: is the still line worth a
						Card?
					</p>
					<p>
						Pick <i>Waits for a tap</i> and step through by hand;
						compare <i>By letters</i> with <i>By word</i> on{" "}
						<i>hatte → haben</i> and <i>da → jM</i>.
					</p>
					<p>
						⤢ opens the front Card as a Sheet, which lists its steps
						and names the next Card in its caption; the route pushes
						the next Card as a Cover.
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
