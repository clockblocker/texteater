import {
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
} from "@/shell";
import type { GlossKnobs } from "./alignment";
import { cases, type QuietAttestation } from "./cases";
import type { GlossStyle } from "./focus";
import type { GlossCase } from "./model";
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

const quietOptions: readonly {
	readonly value: QuietAttestation;
	readonly label: string;
	readonly hint: string;
}[] = [
	{
		value: "skip",
		label: "Open on the Surface",
		hint: "Nothing moves, so the Deck skips the Attestation Card",
	},
	{
		value: "static",
		label: "Static Attestation",
		hint: "An Attestation Card with one line, mit → dative, then the link",
	},
];

/** The demo's half of the inspector: the case, the knobs and what to try. */
export function InspectorPanel({
	glossCase,
	onCase,
	knobs,
	note,
	quiet,
	setKnob,
}: {
	readonly glossCase: GlossCase;
	readonly onCase: (next: GlossCase) => void;
	readonly knobs: GlossKnobs;
	readonly note: boolean;
	readonly quiet: QuietAttestation;
	readonly setKnob: (name: KnobName, value: string | boolean) => void;
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
				{glossCase.attestation.syntax ? null : (
					<InspectorChoice
						label="Nothing to rearrange"
						options={quietOptions}
						value={quiet}
						onChange={(value) => setKnob("quiet", value)}
					/>
				)}
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
					Morpheme row (da-mit, hab-te)
				</InspectorCheck>
				<InspectorCheck
					checked={knobs.lines}
					onChange={(on) => setKnob("lines", on)}
				>
					Lines from each piece to where it lands
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
						Click <i>damit</i>. The Attestation Card glosses the
						words on the page into the Surface line, syntax only:
						read the crossing lines as <i>hatte</i> moves to the
						end, <i>es</i> fills <i>jD</i>, <i>da-</i> fills{" "}
						<i>jM</i> and <i>mit</i> stays the fixed word.
					</p>
					<p>
						Click the line it lands on,{" "}
						<i>→ jD mit jM zu tun hatte</i>, to deal the Surface
						Card: inflection only, <i>hab-te</i> into <i>haben</i>{" "}
						and <i>jD</i> dropping out. Its{" "}
						<i>→ mit jM zu tun haben</i> deals the Lemma Card; a
						tail goes back.
					</p>
					<p>
						Tap or hover each word, and each token of the line it
						lands on, to light its lines and read its note. ⤢ opens
						a Card as a Sheet; on the Attestation it adds the whole
						sentence, with what <i>es</i> and <i>damit</i> point to.
					</p>
					<p>
						Switch to <i>Kindern</i>, where nothing moves, and
						compare opening on the Surface with a static Attestation
						Card. Compare the gloss rows at 390 and 1440.
					</p>
				</InspectorTry>
			</InspectorSection>
		</>
	);
}
