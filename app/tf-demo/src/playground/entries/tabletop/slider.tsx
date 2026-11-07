/** A numeric knob for the inspector: a range with its value beside the label. */
export function InspectorSlider({
	label,
	value,
	min,
	max,
	step,
	format,
	onChange,
}: {
	readonly label: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly format: (value: number) => string;
	readonly onChange: (value: number) => void;
}) {
	return (
		<label className="grid gap-1 text-ink-soft">
			<span className="flex justify-between gap-3">
				{label}
				<output className="font-mono text-xs text-ink">
					{format(value)}
				</output>
			</span>
			<input
				type="range"
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</label>
	);
}
