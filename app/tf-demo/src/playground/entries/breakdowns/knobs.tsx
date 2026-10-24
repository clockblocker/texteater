import type { Dispatch, SetStateAction } from "react";
import { type BreakdownDisplay, DEFAULT_BREAKDOWN_DISPLAY } from "@/notes";
import { InspectorChoice, InspectorSection } from "./inspector";

/**
 * The prototype's picks for #1241: the hover reveal as the user sketched it,
 * and the choice it raises decided one way, each alternative a knob away.
 */
export const PROTOTYPE_BREAKDOWN_DISPLAY: BreakdownDisplay = {
	...DEFAULT_BREAKDOWN_DISPLAY,
	morphemes: "Reveal",
	neighbours: "Nothing",
	click: "PinAndOpen",
	touch: "TapRevealsThenOpens",
	zeroEnding: "TargetAfterWord",
	chunk: "Unlabeled",
	motion: "Draw",
	formations: "LemmaOnly",
	sources: "Listed",
};

type SetDisplay = Dispatch<SetStateAction<BreakdownDisplay>>;

function Knob<Key extends keyof BreakdownDisplay>({
	field,
	label,
	options,
	display,
	setDisplay,
}: {
	readonly field: Key;
	readonly label: string;
	readonly options: readonly {
		readonly value: BreakdownDisplay[Key] & string;
		readonly label: string;
	}[];
	readonly display: BreakdownDisplay;
	readonly setDisplay: SetDisplay;
}) {
	return (
		<InspectorChoice
			label={label}
			value={display[field] as BreakdownDisplay[Key] & string}
			options={options}
			onChange={(value) =>
				setDisplay((current) => ({ ...current, [field]: value }))
			}
		/>
	);
}

export function BreakdownKnobs({
	display,
	setDisplay,
	presentation,
	setPresentation,
}: {
	readonly display: BreakdownDisplay;
	readonly setDisplay: SetDisplay;
	readonly presentation: "Sheet" | "Card";
	readonly setPresentation: (presentation: "Sheet" | "Card") => void;
}) {
	const reveal = display.morphemes === "Reveal";
	const props = { display, setDisplay };
	return (
		<>
			<InspectorSection title="Morphemes">
				<Knob
					{...props}
					field="morphemes"
					label="Marks"
					options={[
						{ value: "Reveal", label: "Reveal one (sketch)" },
						{ value: "Marks", label: "All at once" },
					]}
				/>
				{reveal ? (
					<>
						<Knob
							{...props}
							field="neighbours"
							label="Next to the revealed one"
							options={[
								{ value: "Nothing", label: "Nothing" },
								{ value: "Boundary", label: "Faint boundary" },
							]}
						/>
						<Knob
							{...props}
							field="click"
							label="Click"
							options={[
								{
									value: "PinAndOpen",
									label: "Pin + open Note",
								},
								{ value: "Open", label: "Open Note" },
							]}
						/>
						<Knob
							{...props}
							field="touch"
							label="Tap (touch emulation in DevTools)"
							options={[
								{
									value: "TapRevealsThenOpens",
									label: "Reveal, tap again to open",
								},
								{ value: "TapOpens", label: "Open at once" },
							]}
						/>
						<Knob
							{...props}
							field="zeroEnding"
							label="Zero ending"
							options={[
								{
									value: "TargetAfterWord",
									label: "Target after the word",
								},
								{ value: "Hidden", label: "Left out" },
							]}
						/>
						<Knob
							{...props}
							field="chunk"
							label="Part not split yet"
							options={[
								{ value: "Unlabeled", label: "Colour only" },
								{
									value: "Underlined",
									label: "Dashed underline",
								},
							]}
						/>
						<Knob
							{...props}
							field="motion"
							label="Motion"
							options={[
								{ value: "Draw", label: "Draw in" },
								{ value: "Fade", label: "Fade" },
								{ value: "Instant", label: "None" },
							]}
						/>
						<InspectorChoice
							label="Speed"
							value={display.slowMotion ? "Slow" : "Normal"}
							options={[
								{ value: "Normal", label: "Normal" },
								{ value: "Slow", label: "Slow motion ×5" },
							]}
							onChange={(speed) =>
								setDisplay((current) => ({
									...current,
									slowMotion: speed === "Slow",
								}))
							}
						/>
					</>
				) : null}
			</InspectorSection>
			<InspectorSection title="Formations">
				<Knob
					{...props}
					field="formations"
					label="Shown on"
					options={[
						{ value: "LemmaOnly", label: "Lemma Note" },
						{ value: "AlsoReadings", label: "+ each Reading Note" },
					]}
				/>
				<Knob
					{...props}
					field="sources"
					label="Words with this one as Source"
					options={[
						{ value: "Listed", label: "Base of: Kauf" },
						{ value: "Hidden", label: "Left out" },
					]}
				/>
			</InspectorSection>
			<InspectorSection title="Frame">
				<InspectorChoice
					label="Presentation"
					value={presentation}
					options={[
						{ value: "Sheet", label: "Sheet" },
						{ value: "Card", label: "Card" },
					]}
					onChange={setPresentation}
				/>
			</InspectorSection>
		</>
	);
}
