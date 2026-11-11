import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useLayoutEffect,
	useRef,
} from "react";

/**
 * What a resting Card holds stays readable, to the eye and to a screen
 * reader alike; only its controls rest (#485). A Link, a Segment or a
 * button in a Card takes no focus and no press: a press falls through to
 * the Card, which lifts it, and the Card opens through its own Open and
 * Lift controls and its Heading. Once the Card is a Sheet, every control
 * works again.
 */

const CONTROL =
	"a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]";

/** A press on a control falls through to the Card, so it picks the Card up. */
const PRESS_THROUGH =
	"[&_:is(a[href],button,input,select,textarea,summary,[contenteditable],[tabindex])]:pointer-events-none";

export function RestingControls({
	resting,
	className = "",
	children,
}: {
	resting: boolean;
	className?: string;
	children: ReactNode;
}) {
	const root = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const element = root.current;
		if (!resting || !element) return;
		return restControls(element);
	}, [resting]);

	/* a screen reader can still activate what it reads; a resting control
	   does nothing then either */
	function swallow(event: ReactMouseEvent<HTMLDivElement>) {
		if (!resting) return;
		const target = event.target as HTMLElement;
		if (!target.closest(CONTROL)) return;
		event.preventDefault();
		event.stopPropagation();
	}

	return (
		<div
			ref={root}
			data-resting={resting || undefined}
			onClickCapture={swallow}
			className={`${resting ? PRESS_THROUGH : ""} ${className}`}
		>
			{children}
		</div>
	);
}

/**
 * Takes every control under `root` out of the tab order, as it is now and
 * as it changes, and returns the undo. A control that sets its own
 * `tabindex` again is put back out; the undo restores what it last set.
 */
function restControls(root: HTMLElement): () => void {
	const own = new Map<Element, string | null>();
	const rest = (control: Element) => {
		const tabIndex = control.getAttribute("tabindex");
		if (tabIndex === "-1" && own.has(control)) return;
		own.set(control, tabIndex);
		control.setAttribute("tabindex", "-1");
	};
	const restAll = () => {
		for (const control of root.querySelectorAll(CONTROL)) rest(control);
	};
	restAll();
	const observer = new MutationObserver(restAll);
	observer.observe(root, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["tabindex", "href", "contenteditable"],
	});
	return () => {
		observer.disconnect();
		for (const [control, tabIndex] of own) {
			if (tabIndex === null) control.removeAttribute("tabindex");
			else control.setAttribute("tabindex", tabIndex);
		}
	};
}
