const eventTypes = [
	"pointerdown",
	"pointerup",
	"pointermove",
	"pointerover",
	"pointerout",
	"pointerenter",
	"pointerleave",
	"pointercancel",
	"gotpointercapture",
	"lostpointercapture",
	"mousedown",
	"mouseup",
	"mousemove",
	"mouseover",
	"mouseout",
	"mouseenter",
	"mouseleave",
	"click",
	"dblclick",
	"auxclick",
	"contextmenu",
	"wheel",
	"scroll",
	"dragstart",
	"drag",
	"dragend",
	"dragenter",
	"dragleave",
	"dragover",
	"drop",
	"focus",
	"blur",
	"focusin",
	"focusout",
	"visibilitychange",
	"resize",
	"selectionchange",
] as const;

type Entry = { t: number; type: string; [key: string]: unknown };
const capacity = 30_000;

/** Passive, local-only recording; raw movement is kept, DOM/style reads are sampled. */
export function startMouseTrace() {
	const startedAt = new Date().toISOString();
	const start = performance.now();
	const entries: Entry[] = [];
	let total = 0;
	let paused = false;
	let lastActivity = -Infinity;
	let lastSample = -Infinity;
	let point: { x: number; y: number } | null = null;
	let frame = 0;
	let cancellationTimer: number | undefined;
	const pendingCancellations = new Map<Entry, Event>();
	const captures = new Map<number, EventTarget | null>();
	const ids = new WeakMap<Element, number>();
	let nextId = 1;
	const listeners = new AbortController();

	function describe(target: EventTarget | null): unknown {
		if (target === window) return "window";
		if (target === document) return "document";
		if (!(target instanceof Element)) return null;
		let node = ids.get(target);
		if (!node) {
			node = nextId++;
			ids.set(target, node);
		}
		return {
			node,
			tag: target.tagName.toLowerCase(),
			id: target.id,
			classes: target.getAttribute("class"),
			role: target.getAttribute("role"),
			slot: target.getAttribute("data-slot"),
		};
	}

	function record(type: string, data: Record<string, unknown> = {}) {
		if (paused) return;
		const entry: Entry = { t: performance.now() - start, type, ...data };
		entries[total % capacity] = entry;
		total++;
		return entry;
	}

	function styles(element: Element) {
		const style = getComputedStyle(element);
		return {
			element: describe(element),
			hover: element.matches(":hover"),
			cursor: style.cursor,
			pointerEvents: style.pointerEvents,
			background: style.backgroundColor,
			color: style.color,
			textDecoration: style.textDecorationLine,
			opacity: style.opacity,
			transform: style.transform,
			zIndex: style.zIndex,
			inert: element.hasAttribute("inert"),
			disabled: element.matches(":disabled"),
		};
	}

	function sample(now: number) {
		frame = 0;
		if (paused || !point || now - lastActivity > 3_000) return;
		if (now - lastSample >= 50) {
			lastSample = now;
			const hits = document.elementsFromPoint(point.x, point.y);
			const top = hits[0];
			const ancestors: ReturnType<typeof styles>[] = [];
			for (
				let el: Element | null = top;
				el && ancestors.length < 12;
				el = el.parentElement
			) {
				ancestors.push(styles(el));
			}
			record("hover-sample", {
				...point,
				hits: hits.slice(0, 8).map(describe),
				ancestors,
				captures: [...captures].map(([pointerId, target]) => ({
					pointerId,
					target: describe(target),
				})),
				focused: document.hasFocus(),
				activeElement: describe(document.activeElement),
				visibility: document.visibilityState,
			});
		}
		frame = requestAnimationFrame(sample);
	}

	function onEvent(event: Event) {
		if (paused || event.composedPath().includes(panel)) return;
		const data: Record<string, unknown> = {
			eventTime: event.timeStamp,
			trusted: event.isTrusted,
			target: describe(event.target),
			defaultPrevented: event.defaultPrevented,
		};
		if (event instanceof MouseEvent) {
			point = { x: event.clientX, y: event.clientY };
			Object.assign(data, point, {
				button: event.button,
				buttons: event.buttons,
				detail: event.detail,
				movementX: event.movementX,
				movementY: event.movementY,
				alt: event.altKey,
				ctrl: event.ctrlKey,
				meta: event.metaKey,
				shift: event.shiftKey,
				relatedTarget: describe(event.relatedTarget),
			});
		}
		if (event instanceof PointerEvent) {
			Object.assign(data, {
				pointerId: event.pointerId,
				pointerType: event.pointerType,
				isPrimary: event.isPrimary,
				pressure: event.pressure,
			});
			if (event.type === "gotpointercapture")
				captures.set(event.pointerId, event.target);
			if (event.type === "lostpointercapture")
				captures.delete(event.pointerId);
		}
		if (event instanceof WheelEvent) {
			Object.assign(data, {
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaMode: event.deltaMode,
			});
		}
		if (event instanceof FocusEvent)
			data.relatedTarget = describe(event.relatedTarget);
		if (event.type === "visibilitychange")
			data.visibility = document.visibilityState;
		if (event.type === "selectionchange")
			data.selectionLength =
				document.getSelection()?.toString().length ?? 0;
		if (event.type === "scroll" && event.target instanceof Element) {
			Object.assign(data, {
				scrollTop: event.target.scrollTop,
				scrollLeft: event.target.scrollLeft,
			});
		}
		const entry = record(event.type, data);
		// Capture listeners run before app handlers; inspect cancellation after dispatch.
		if (entry && event.cancelable) {
			pendingCancellations.set(entry, event);
			cancellationTimer ??= window.setTimeout(() => {
				for (const [pending, dispatched] of pendingCancellations)
					pending.defaultPrevented = dispatched.defaultPrevented;
				pendingCancellations.clear();
				cancellationTimer = undefined;
			}, 0);
		}
		lastActivity = performance.now();
		if (!frame) frame = requestAnimationFrame(sample);
	}

	const panel = document.createElement("details");
	panel.dataset.mouseTrace = "";
	panel.style.cssText =
		"position:fixed;right:12px;top:12px;z-index:2147483647;max-width:290px;padding:8px 12px;border:1px solid #667085;border-radius:8px;background:#151a21;color:#f1f5f9;font:12px/1.5 system-ui;";
	const summary = document.createElement("summary");
	summary.textContent = "Mouse trace · recording";
	summary.style.cursor = "pointer";
	panel.append(summary);
	const help = document.createElement("p");
	help.textContent =
		"Reproduce the freeze, then press Option/Alt+Shift+M to mark it without moving the pointer. Download afterward. Local to this tab; reload clears the log. Keeps the latest 30,000 entries.";
	panel.append(help);
	const status = document.createElement("p");
	status.setAttribute("role", "status");
	panel.append(status);

	function button(label: string, action: () => void) {
		const el = document.createElement("button");
		el.type = "button";
		el.textContent = label;
		el.style.cssText =
			"margin:3px;padding:4px 8px;border:1px solid #667085;border-radius:4px;cursor:pointer;";
		el.addEventListener("click", action);
		panel.append(el);
		return el;
	}
	function markFreeze() {
		record("marker", { label: "hover freeze" });
		status.textContent = paused
			? "Resume recording to mark a freeze."
			: `Freeze marked at ${((performance.now() - start) / 1000).toFixed(1)}s.`;
	}
	button("Mark freeze", markFreeze);
	window.addEventListener(
		"keydown",
		(event) => {
			if (
				event.altKey &&
				event.shiftKey &&
				event.code === "KeyM" &&
				!event.repeat
			)
				markFreeze();
		},
		{ signal: listeners.signal },
	);
	const pauseButton = button("Pause", () => {
		if (!paused) record("pause");
		paused = !paused;
		if (!paused) {
			captures.clear();
			record("resume");
		}
		pauseButton.textContent = paused ? "Resume" : "Pause";
		summary.textContent = `Mouse trace · ${paused ? "paused" : "recording"}`;
	});
	const urls = new Set<string>();
	button("Download JSON", () => {
		const ordered =
			total <= capacity
				? entries
				: [
						...entries.slice(total % capacity),
						...entries.slice(0, total % capacity),
					];
		const report = {
			version: 1,
			startedAt,
			exportedAt: new Date().toISOString(),
			userAgent: navigator.userAgent,
			path: location.pathname,
			viewport: {
				width: innerWidth,
				height: innerHeight,
				devicePixelRatio,
			},
			media: {
				hover: matchMedia("(hover: hover)").matches,
				finePointer: matchMedia("(pointer: fine)").matches,
				reducedMotion: matchMedia("(prefers-reduced-motion: reduce)")
					.matches,
			},
			droppedEntries: Math.max(0, total - capacity),
			entries: ordered,
		};
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(report, null, 2)], {
				type: "application/json",
			}),
		);
		urls.add(url);
		const link = document.createElement("a");
		link.href = url;
		link.download = `tf-demo-mouse-${new Date().toISOString().replaceAll(":", "-")}.json`;
		link.click();
		setTimeout(() => {
			URL.revokeObjectURL(url);
			urls.delete(url);
		}, 1_000);
		status.textContent = `Exported ${ordered.length} entries.`;
	});
	button("Clear", () => {
		entries.length = 0;
		total = 0;
		lastActivity = -Infinity;
		status.textContent = "Log cleared.";
		record("clear");
	});
	document.body.append(panel);
	for (const type of eventTypes) {
		window.addEventListener(type, onEvent, {
			capture: true,
			passive: true,
			signal: listeners.signal,
		});
	}
	const observer = PerformanceObserver.supportedEntryTypes.includes(
		"longtask",
	)
		? new PerformanceObserver((list) => {
				for (const entry of list.getEntries())
					record("longtask", {
						startTime: entry.startTime - start,
						duration: entry.duration,
					});
			})
		: null;
	observer?.observe({ type: "longtask" });
	record("start");
	return () => {
		listeners.abort();
		observer?.disconnect();
		cancelAnimationFrame(frame);
		clearTimeout(cancellationTimer);
		pendingCancellations.clear();
		panel.remove();
		for (const url of urls) URL.revokeObjectURL(url);
	};
}
