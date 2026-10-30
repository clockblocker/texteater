import {
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
} from "@/shell";
import type { GlossKnobs } from "./alignment";
import { cases, type GlossCase } from "./cases";
import type { GlossStyle } from "./focus";
import type { KnobName } from "./use-knobs";

const styleOptions: readonly {
	readonly value: GlossStyle;
	readonly label: string;
	readonly hint: string;
}[] = [
	{
		value: "leipzig",
		label: "Leipzig labels",
		hint: "have-PST.IND.3SG: small-caps labels, named on hover",
	},
	{
		value: "spelled",
		label: "Spelled out",
		hint: "have-past.indicative.he/she/it: rule 3's metalanguage words",
	},
	{
		value: "plain",
		label: "Plain words",
		hint: "had: one English word per German word, as Interlinear Books print it",
	},
];

/** The demo's half of the inspector: the case, the knobs and what to try. */
export function InspectorPanel({
	glossCase,
	onCase,
	knobs,
	note,
	setKnob,
}: {
	readonly glossCase: GlossCase;
	readonly onCase: (next: GlossCase) => void;
	readonly knobs: GlossKnobs;
	readonly note: boolean;
	readonly setKnob: (name: KnobName, value: GlossStyle | boolean) => void;
}) {
	return (
		<>
			<InspectorSection title="Case">
				<InspectorChoice
					label="Clicked words"
					options={cases.map((each) => ({
						value: each.id,
						label: each.label,
						hint: each.hint,
					}))}
					value={glossCase.id}
					onChange={(id) => {
						const next = cases.find((each) => each.id === id);
						if (next) onCase(next);
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Gloss">
				<InspectorChoice
					label="Gloss row"
					options={styleOptions}
					value={knobs.style}
					onChange={(style) => setKnob("style", style)}
				/>
				<InspectorCheck
					checked={knobs.morphRow}
					onChange={(on) => setKnob("morphRow", on)}
				>
					Morpheme row (hab-te, da-mit)
				</InspectorCheck>
				<InspectorCheck
					checked={knobs.lines}
					onChange={(on) => setKnob("lines", on)}
				>
					Lines from each piece to the lemma
				</InspectorCheck>
				<InspectorCheck
					checked={note}
					onChange={(on) => setKnob("note", on)}
				>
					The focused word's note under the gloss
				</InspectorCheck>
			</InspectorSection>
			<InspectorSection title="Try">
				<InspectorTry>
					<p>
						Click <i>damit</i> (or <i>Kindern</i>). Tap or hover
						each glossed word, and each word of the lemma, to light
						its lines and read its note.
					</p>
					<p>
						Read the crossing lines: <i>hatte</i> comes first in the
						sentence and <i>haben</i> last in the lemma; <i>da-</i>{" "}
						lands on the <i>jM</i> slot; <i>es</i> and <i>-te</i>{" "}
						land nowhere.
					</p>
					<p>
						⤢ opens the Sheet: the whole clause glossed, with what{" "}
						<i>es</i> and <i>damit</i> point to. Compare the three
						gloss rows at 390 and 1440.
					</p>
					<p>
						Only the clicked unit is authored; other words close the
						popover.
					</p>
				</InspectorTry>
			</InspectorSection>
		</>
	);
}
