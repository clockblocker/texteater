/** Ends the running action and starts the next queued one. */
export type Next = (err?: unknown) => void;

type Action = (next: Next) => void;

export type Queueable = {
	/** Runs `action` once every action queued before it has called `next`. */
	queue: (action?: Action) => void;
	/** Wraps `action` so each call queues it, `next` first, then the args. */
	queued: <Args extends unknown[]>(
		action: (next: Next, ...args: Args) => void,
	) => (...args: Args) => void;
};

/** Adds `queue` and `queued` to `target`; its actions run one at a time. */
export function queueable<T extends object>(target: T): T & Queueable {
	const self = target as T & Queueable;
	let queueing: Action[] = [];

	self.queue = queue;
	self.queued = queued;

	return self;

	function queued<Args extends unknown[]>(
		action: (next: Next, ...args: Args) => void,
	) {
		return function (this: unknown, ...args: Args) {
			queue((next) => {
				action.apply(this, [next, ...args]);
			});
		};
	}

	function queue(action?: Action) {
		if (!action) {
			return;
		}

		queueing.push(action);

		if (queueing.length === 1) {
			next();
		}
	}

	function next() {
		queueing[0]?.((err) => {
			if (err) {
				throw err;
			}

			queueing = queueing.slice(1);

			if (queueing.length) {
				next();
			}
		});
	}
}
