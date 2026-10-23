import { Button } from "lego";
import { InfoIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

const OPEN_KEY = "tf-demo:playground:breakdowns:inspector-open";

/**
 * The floating inspector of playground ADR 0001: explanation, knobs and
 * hints live here, outside the Note being judged. It docks in the gutter at
 * the inline end, and its trigger follows it; `i` toggles it.
 */
export function Inspector({ children }: { readonly children: ReactNode }) {
	const [open, setOpen] = useState(
		() => localStorage.getItem(OPEN_KEY) !== "false",
	);
	useEffect(() => {
		localStorage.setItem(OPEN_KEY, String(open));
	}, [open]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const typing =
				event.target instanceof HTMLElement &&
				event.target.closest("input, textarea, [contenteditable]");
			if (
				event.key === "i" &&
				!typing &&
				!event.metaKey &&
				!event.ctrlKey
			)
				setOpen((value) => !value);
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	return open ? (
		<aside
			aria-label="Inspector"
			className="fixed end-4 top-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-line bg-canvas/95 text-sm text-ink shadow-[0_1rem_2rem_#0004] backdrop-blur"
		>
			<header className="flex items-center justify-between border-b border-line px-4 py-2.5">
				<h2 className="font-semibold">Breakdowns</h2>
				<Button
					size="icon"
					variant="ghost"
					aria-label="Close inspector"
					onClick={() => setOpen(false)}
				>
					<XIcon aria-hidden="true" />
				</Button>
			</header>
			<div className="grid min-h-0 flex-1 content-start gap-5 overflow-auto px-4 py-4">
				{children}
			</div>
		</aside>
	) : (
		<Button
			className="fixed end-4 top-4 z-50"
			size="icon"
			variant="outline"
			aria-label="Open inspector"
			onClick={() => setOpen(true)}
		>
			<InfoIcon aria-hidden="true" />
		</Button>
	);
}

export function InspectorSection({
	title,
	children,
}: {
	readonly title?: string;
	readonly children: ReactNode;
}) {
	return (
		<section className="grid gap-2">
			{title ? (
				<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{title}
				</h3>
			) : null}
			{children}
		</section>
	);
}

/** A segmented choice between named options. */
export function InspectorChoice<Value extends string>({
	label,
	value,
	options,
	onChange,
}: {
	readonly label: string;
	readonly value: Value;
	readonly options: readonly {
		readonly value: Value;
		readonly label: string;
	}[];
	readonly onChange: (value: Value) => void;
}) {
	return (
		<fieldset className="grid gap-1">
			<legend className="mb-1 text-ink-soft">{label}</legend>
			<div className="flex flex-wrap gap-1">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						aria-pressed={option.value === value}
						className="cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft aria-pressed:border-primary aria-pressed:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</button>
				))}
			</div>
		</fieldset>
	);
}
