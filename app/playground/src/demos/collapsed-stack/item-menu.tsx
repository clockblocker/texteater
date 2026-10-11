import { Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rectWithin } from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";
import { IconButton } from "./lookup";

export type MenuAction = {
	readonly label: string;
	readonly run: () => void;
	readonly disabled?: boolean;
};

const menuBlockSize = 172;

/**
 * A ⋯ button whose menu is portalled into the frame, so the stack's
 * scrolling can't clip it. It opens below the button, or above it near
 * the frame's bottom, and closes on a pick, Escape, scrolling or a press
 * elsewhere.
 */
export function ItemMenu({
	label,
	actions,
}: {
	readonly label: string;
	readonly actions: readonly MenuAction[];
}) {
	const { frame, dir } = usePlaygroundEnv();
	const [anchor, setAnchor] = useState<DOMRect | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!anchor) return;
		const isInside = (target: EventTarget | null) =>
			target instanceof Node &&
			(menuRef.current?.contains(target) ||
				buttonRef.current?.contains(target));
		const onPointerDown = (event: PointerEvent) => {
			if (!isInside(event.target)) setAnchor(null);
		};
		const onScroll = (event: Event) => {
			if (!isInside(event.target)) setAnchor(null);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setAnchor(null);
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("scroll", onScroll, true);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("scroll", onScroll, true);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [anchor]);

	const toggle = () => {
		const button = buttonRef.current;
		setAnchor(anchor || !button ? null : button.getBoundingClientRect());
	};

	let menu = null;
	if (anchor && frame) {
		const rect = rectWithin(anchor, frame);
		const below = rect.bottom + 4 + menuBlockSize <= frame.clientHeight;
		menu = createPortal(
			<div
				ref={menuRef}
				className="fixed z-50 grid min-w-44 rounded-lg border border-line bg-paper p-1 text-sm text-ink shadow-[0_12px_32px_-12px_oklch(0%_0_0/0.5)]"
				style={{
					...(below
						? { top: rect.bottom + 4 }
						: { bottom: frame.clientHeight - rect.top + 4 }),
					insetInlineEnd:
						dir === "rtl"
							? rect.left
							: frame.clientWidth - rect.right,
				}}
			>
				{actions.map((action) => (
					<button
						key={action.label}
						type="button"
						disabled={action.disabled}
						onClick={() => {
							setAnchor(null);
							action.run();
						}}
						className="cursor-pointer rounded-md px-2.5 py-1.5 text-start hover:bg-canvas disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
					>
						{action.label}
					</button>
				))}
			</div>,
			frame,
		);
	}

	return (
		<>
			<IconButton
				ref={buttonRef}
				label={label}
				expanded={anchor !== null}
				onClick={toggle}
			>
				<Ellipsis size={16} />
			</IconButton>
			{menu}
		</>
	);
}
