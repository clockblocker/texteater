import { cn } from "lego";
import type { ReactNode } from "react";

/**
 * Controls for a demo's knobs in the inspector panel. They are styled for
 * the panel (dark chrome, left-to-right), not for the frame.
 */

type Option<Value> = {
	readonly value: Value;
	readonly label: ReactNode;
	/** Shown on hover. */
	readonly hint?: string;
};

/** A labelled row of toggle buttons, one of which is on. */
export function InspectorChoice<Value extends string | number>({
	label,
	options,
	value,
	onChange,
}: {
	readonly label: string;
	readonly options: readonly Option<Value>[];
	readonly value: Value;
	readonly onChange: (value: Value) => void;
}) {
	return (
		<fieldset className="grid gap-1.5">
			<legend className="mb-1.5 text-xs text-ink-muted">{label}</legend>
			<div className="flex flex-wrap gap-1">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						aria-pressed={option.value === value}
						title={option.hint}
						onClick={() => onChange(option.value)}
						className={cn(
							"cursor-pointer rounded-md border px-2 py-1 text-start text-xs",
							option.value === value
								? "border-link bg-link/15 text-ink"
								: "border-line text-ink-soft hover:text-ink",
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		</fieldset>
	);
}

/** A checkbox with its label. */
export function InspectorCheck({
	checked,
	onChange,
	title,
	children,
}: {
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly title?: string;
	readonly children: ReactNode;
}) {
	return (
		<label
			title={title}
			className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft hover:text-ink"
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="accent-(--link)"
			/>
			{children}
		</label>
	);
}

/** A labelled range input that shows its formatted value. */
export function InspectorRange({
	label,
	min,
	max,
	step,
	value,
	onChange,
	format = String,
}: {
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly value: number;
	readonly onChange: (value: number) => void;
	readonly format?: (value: number) => ReactNode;
}) {
	return (
		<label className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
			<span className="text-ink-muted">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="min-w-0 accent-(--link)"
			/>
			<output className="font-mono text-ink tabular-nums">
				{format(value)}
			</output>
		</label>
	);
}

/** "Try:" hints, one per line. */
export function InspectorTry({ children }: { readonly children: ReactNode }) {
	return (
		<div className="grid gap-1 text-xs leading-relaxed text-ink-soft [&_i]:text-ink [&_em]:text-ink">
			{children}
		</div>
	);
}
