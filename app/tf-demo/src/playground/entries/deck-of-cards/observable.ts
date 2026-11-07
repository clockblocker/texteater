type Callback = (...args: unknown[]) => void;

type Listener = {
	readonly cb: Callback;
	readonly ctx: unknown;
	readonly once?: boolean;
};

/** Named events. The library itself never triggers any. */
export type Observable = {
	on: (name: string, cb: Callback, ctx?: unknown) => void;
	one: (name: string, cb: Callback, ctx?: unknown) => void;
	off: (name?: string, cb?: Callback) => void;
	trigger: (name: string) => void;
};

/** Adds `on`, `one`, `off` and `trigger` to `target`. */
export function observable<T extends object>(target: T): T & Observable {
	const self = target as T & Observable;
	let listeners: Record<string, Listener[]> = {};

	self.on = on;
	self.one = one;
	self.off = off;
	self.trigger = trigger;

	return self;

	function on(name: string, cb: Callback, ctx?: unknown) {
		listeners[name] ??= [];
		listeners[name].push({ cb, ctx });
	}

	function one(name: string, cb: Callback, ctx?: unknown) {
		listeners[name] ??= [];
		listeners[name].push({ cb, ctx, once: true });
	}

	/**
	 * Calls the listeners with `this` and no arguments, and keeps `one`
	 * listeners, as upstream does: it slices `Array.prototype` rather than
	 * `arguments`, and drops the result of the `filter` meant to remove them.
	 */
	function trigger(this: unknown, name: string) {
		const args: unknown[] = [];

		const currentListeners = listeners[name] || [];

		currentListeners.forEach((listener) => {
			listener.cb.apply(this, args);
		});
	}

	function off(name?: string, cb?: Callback) {
		if (!name) {
			listeners = {};
			return;
		}

		if (!cb) {
			listeners[name] = [];
			return;
		}

		listeners[name] = (listeners[name] as Listener[]).filter(
			(listener) => listener.cb !== cb,
		);
	}
}
