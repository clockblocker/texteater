/** A labelled row of toggle buttons, one of which is on. */
export function Segmented<Value extends string | number>({
	label,
	options,
	value,
	onChange,
	format = String,
}: {
	readonly label: string;
	readonly options: readonly Value[];
	readonly value: Value;
	readonly onChange: (value: Value) => void;
	readonly format?: (value: Value) => string;
}) {
	return (
		<fieldset className="flex items-center gap-1.5">
			<legend className="float-start me-1.5 text-ink-muted">
				{label}
			</legend>
			<div className="flex rounded-md border border-line bg-canvas p-0.5">
				{options.map((option) => (
					<button
						key={option}
						type="button"
						aria-pressed={option === value}
						onClick={() => onChange(option)}
						className="cursor-pointer rounded px-2 py-0.5 text-ink-soft aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:shadow-sm"
					>
						{format(option)}
					</button>
				))}
			</div>
		</fieldset>
	);
}

/** A labelled range input that shows its value in px. */
export function PxSlider({
	label,
	min,
	max,
	step,
	value,
	onChange,
}: {
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly value: number;
	readonly onChange: (value: number) => void;
}) {
	return (
		<label className="flex items-center gap-2">
			<span className="text-ink-muted">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="w-28 accent-(--link)"
			/>
			<span className="w-12 font-mono text-ink tabular-nums">
				{value}px
			</span>
		</label>
	);
}
