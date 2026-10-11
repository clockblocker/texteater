import { Button, cn } from "lego";
import { ActivityIcon, XIcon } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * The demo inspector: a floating button in a corner of the stage, after
 * tf-demo's Resolution inspector, that opens a panel with the demo's
 * title, description and inspiration, then whatever the demo puts there
 * with `<DemoInspector>`. The panel is app chrome outside the frame, so
 * explanation, knobs and readouts never take the frame's room, and it
 * keeps to the side away from where the demo's lookup appears.
 */

/**
 * Where in the frame a demo's evaluated surface appears, in the frame's
 * own logical terms: a pane at the inline end, a bottom sheet at the
 * block end. The inspector keeps to the other side.
 */
export type InspectorAvoid = "inline-start" | "inline-end" | "block-end";

/** The panel's corner in the stage, in the left-to-right chrome's terms. */
export type InspectorPlacement = {
	readonly side: "start" | "end";
	readonly edge: "top" | "bottom";
};

type SlotContext = {
	readonly slot: HTMLElement | null;
	readonly setAvoid: (avoid: InspectorAvoid | null) => void;
};

const InspectorSlotContext = createContext<SlotContext>({
	slot: null,
	setAvoid: () => {},
});

/**
 * Tells the shell where the demo's lookup appears now, so the inspector
 * and its button sit on the other side: beside the frame when the stage
 * has room, floating over the frame's far side when it hasn't.
 */
export function useInspectorAvoid(avoid: InspectorAvoid | null): void {
	const { setAvoid } = useContext(InspectorSlotContext);
	useEffect(() => {
		setAvoid(avoid);
		return () => setAvoid(null);
	}, [avoid, setAvoid]);
}

/**
 * The corner for the panel when the frame's `dir` is `dir` and the demo
 * avoids `avoid`. The chrome is left-to-right, so the frame's inline end
 * is the chrome's end only in a left-to-right frame.
 */
export function inspectorPlacement(
	avoid: InspectorAvoid | null,
	dir: "ltr" | "rtl",
): InspectorPlacement {
	if (avoid === "block-end") return { side: "end", edge: "top" };
	if (avoid === null) return { side: "end", edge: "bottom" };
	const contentAtEnd = (avoid === "inline-end") === (dir === "ltr");
	return { side: contentAtEnd ? "start" : "end", edge: "bottom" };
}

/** The panel's width in CSS px (22rem). */
export const inspectorWidth = 352;

const storageKey = "playground:inspector";

/**
 * Renders `children` in the inspector panel instead of the frame: a
 * demo's "try this" hints, its knobs and its live readouts. It is a
 * portal, so the children keep the demo's state and context and stay live
 * while the panel is open; they are mounted, hidden, while it is closed.
 * A demo may render several; they appear in mount order.
 */
export function DemoInspector({ children }: { readonly children: ReactNode }) {
	const { slot } = useContext(InspectorSlotContext);
	return slot ? createPortal(children, slot) : null;
}

/** A titled block in the inspector panel. */
export function InspectorSection({
	title,
	children,
	className,
}: {
	readonly title?: string;
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return (
		<section className={cn("grid gap-2", className)}>
			{title ? (
				<h3 className="text-[0.7rem] font-medium tracking-wide text-ink-muted uppercase">
					{title}
				</h3>
			) : null}
			{children}
		</section>
	);
}

/** Whether the panel is open, remembered across reloads. Open at first. */
export function useInspectorOpen(): readonly [
	boolean,
	(open: boolean | ((open: boolean) => boolean)) => void,
] {
	const [open, setOpen] = useState(
		() => localStorage.getItem(storageKey) !== "closed",
	);
	useEffect(() => {
		localStorage.setItem(storageKey, open ? "open" : "closed");
	}, [open]);
	return [open, setOpen];
}

/**
 * Provides the panel's slot to every `<DemoInspector>` below it, and
 * `useInspectorAvoid`'s setter.
 */
export function InspectorSlotProvider({
	slot,
	setAvoid,
	children,
}: {
	readonly slot: HTMLElement | null;
	readonly setAvoid: (avoid: InspectorAvoid | null) => void;
	readonly children: ReactNode;
}) {
	const value = useMemo(() => ({ slot, setAvoid }), [slot, setAvoid]);
	return (
		<InspectorSlotContext.Provider value={value}>
			{children}
		</InspectorSlotContext.Provider>
	);
}

/**
 * The trigger and the panel, placed in the stage's corner `placement`,
 * the trigger nearest the corner. `i` toggles the panel from anywhere but a text field; Esc closes
 * it unless focus is inside the frame, where Esc belongs to the demo.
 */
export function Inspector({
	placement,
	open,
	onOpenChange,
	title,
	description,
	inspiration,
	onSlot,
}: {
	readonly placement: InspectorPlacement;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly title: string;
	readonly description?: string;
	readonly inspiration?: readonly string[];
	readonly onSlot: (slot: HTMLElement | null) => void;
}) {
	const trigger = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLElement>(null);
	const close = useCallback(() => {
		if (panel.current?.contains(document.activeElement))
			trigger.current?.focus();
		onOpenChange(false);
	}, [onOpenChange]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key === "i" || event.key === "I") {
				if (isTextEntry(event.target)) return;
				event.preventDefault();
				onOpenChange(!open);
				return;
			}
			if (event.key !== "Escape" || !open) return;
			const focused = document.activeElement;
			if (focused?.closest("[data-playground-frame]")) return;
			// Capture phase: the demo's own Esc handlers don't see it.
			event.stopPropagation();
			close();
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [open, onOpenChange, close]);

	const side = placement.side === "end" ? "end-4" : "start-4";
	const top = placement.edge === "top";
	return (
		<div className="dark contents">
			<aside
				ref={panel}
				hidden={!open}
				aria-label={`${title}: inspector`}
				className={cn(
					"absolute z-40 flex max-h-[calc(100%-5rem)] w-[min(22rem,calc(100%-2rem))] flex-col rounded-2xl border border-line bg-popover text-sm text-popover-foreground shadow-[0_16px_48px_#0006]",
					side,
					top ? "top-16" : "bottom-16",
				)}
			>
				<header className="flex shrink-0 items-start gap-2 border-b border-line py-3 ps-4 pe-2">
					<div className="grid min-w-0 flex-1 gap-1">
						<strong className="font-semibold">{title}</strong>
						{description ? (
							<p className="text-ink-soft">{description}</p>
						) : null}
						{inspiration && inspiration.length > 0 ? (
							<p className="text-xs text-ink-muted">
								After {inspiration.join(", ")}
							</p>
						) : null}
					</div>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Close the inspector"
						title="Close (Esc)"
						onClick={close}
					>
						<XIcon />
					</Button>
				</header>
				<div
					ref={onSlot}
					className="grid min-h-0 content-start gap-5 overflow-y-auto p-4 empty:hidden"
				/>
			</aside>
			<Button
				ref={trigger}
				size="icon"
				variant="outline"
				aria-label="Demo inspector"
				aria-expanded={open}
				aria-keyshortcuts="i"
				title="Inspector (i)"
				onClick={() => onOpenChange(!open)}
				className={cn(
					"absolute z-40 text-ink shadow-[0_4px_16px_#0004]",
					side,
					top ? "top-4" : "bottom-4",
				)}
			>
				<ActivityIcon aria-hidden="true" />
			</Button>
		</div>
	);
}

function isTextEntry(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	if (target instanceof HTMLTextAreaElement) return true;
	if (target instanceof HTMLSelectElement) return true;
	if (target instanceof HTMLInputElement)
		return !["checkbox", "radio", "range", "button"].includes(target.type);
	return false;
}
