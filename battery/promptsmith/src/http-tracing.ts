import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";

type TraceContext = {
	readonly started: number;
	readonly runtimeRequestOrdinal: number;
	readonly executorRequestOrdinal: number;
	diagnosticsObserved: boolean;
	requestCreatedMs?: number;
	connectStartedMs?: number;
	connectedMs?: number;
	headersSentMs?: number;
	requestBodySentMs?: number;
	responseHeadersMs?: number;
	firstResponseBodyChunkMs?: number;
	responseBodyCompleteMs?: number;
	connectionReused?: boolean;
};

const runtimeInstanceId = crypto.randomUUID();
const runtimeStarted = performance.now();
let runtimeRequestOrdinal = 0;
const activeTrace = new AsyncLocalStorage<TraceContext>();
const requestTraces = new WeakMap<object, TraceContext>();
const socketUses = new WeakMap<object, number>();

function objectField(value: unknown, key: string): object | undefined {
	if (!value || typeof value !== "object") return undefined;
	const field = (value as Record<string, unknown>)[key];
	return field && typeof field === "object" ? field : undefined;
}

function elapsed(trace: TraceContext): number {
	return performance.now() - trace.started;
}

function durationBetween(
	started: number | undefined,
	finished: number | undefined,
): number | undefined {
	return started === undefined || finished === undefined
		? undefined
		: finished - started;
}

function traceForRequest(message: unknown): TraceContext | undefined {
	const request = objectField(message, "request");
	return request ? requestTraces.get(request) : undefined;
}

function observeRequest(
	name: string,
	observe: (trace: TraceContext, message: unknown) => void,
): void {
	channel(name).subscribe((message) => {
		const trace = traceForRequest(message);
		if (!trace) return;
		trace.diagnosticsObserved = true;
		observe(trace, message);
	});
}

channel("undici:request:create").subscribe((message) => {
	const trace = activeTrace.getStore();
	const request = objectField(message, "request");
	if (!trace || !request) return;
	trace.diagnosticsObserved = true;
	trace.requestCreatedMs = elapsed(trace);
	requestTraces.set(request, trace);
});

channel("undici:client:beforeConnect").subscribe(() => {
	const trace = activeTrace.getStore();
	if (!trace || trace.connectStartedMs !== undefined) return;
	trace.diagnosticsObserved = true;
	trace.connectStartedMs = elapsed(trace);
});

channel("undici:client:connected").subscribe(() => {
	const trace = activeTrace.getStore();
	if (!trace) return;
	trace.diagnosticsObserved = true;
	trace.connectedMs = elapsed(trace);
});

observeRequest("undici:client:sendHeaders", (trace, message) => {
	trace.headersSentMs = elapsed(trace);
	const socket = objectField(message, "socket");
	if (!socket) return;
	const uses = socketUses.get(socket) ?? 0;
	trace.connectionReused = uses > 0;
	socketUses.set(socket, uses + 1);
});

observeRequest("undici:request:bodySent", (trace) => {
	trace.requestBodySentMs = elapsed(trace);
});

observeRequest("undici:request:headers", (trace) => {
	trace.responseHeadersMs = elapsed(trace);
});

observeRequest("undici:request:bodyChunkReceived", (trace) => {
	trace.firstResponseBodyChunkMs ??= elapsed(trace);
});

observeRequest("undici:request:trailers", (trace) => {
	trace.responseBodyCompleteMs = elapsed(trace);
});

export function createHttpTrace(executorRequestOrdinal: number): TraceContext {
	return {
		started: performance.now(),
		runtimeRequestOrdinal: ++runtimeRequestOrdinal,
		executorRequestOrdinal,
		diagnosticsObserved: false,
	};
}

export function runWithHttpTrace<T>(
	trace: TraceContext,
	run: () => Promise<T>,
): Promise<T> {
	return activeTrace.run(trace, run);
}

/** Socket lifecycle detail is best effort: custom fetch implementations may not emit Undici events. */
export function httpTraceMetadata(trace: TraceContext) {
	const connectionMs = durationBetween(
		trace.connectStartedMs,
		trace.connectedMs,
	);
	const requestUploadMs = durationBetween(
		trace.headersSentMs,
		trace.requestBodySentMs,
	);
	const responseWaitAfterUploadMs = durationBetween(
		trace.requestBodySentMs,
		trace.responseHeadersMs,
	);
	const responseHeadersToFirstBodyByteMs = durationBetween(
		trace.responseHeadersMs,
		trace.firstResponseBodyChunkMs,
	);
	const responseDownloadMs = durationBetween(
		trace.firstResponseBodyChunkMs,
		trace.responseBodyCompleteMs,
	);
	return {
		instrumentation: trace.diagnosticsObserved ? "undici" : "fetch",
		runtime: {
			instanceId: runtimeInstanceId,
			instanceAgeMs: trace.started - runtimeStarted,
			requestOrdinal: trace.runtimeRequestOrdinal,
			executorRequestOrdinal: trace.executorRequestOrdinal,
		},
		connection: {
			...(trace.connectionReused === undefined
				? {}
				: { reused: trace.connectionReused }),
			...(trace.connectStartedMs === undefined ? {} : { opened: true }),
			...(connectionMs === undefined ? {} : { connectionMs }),
		},
		phasesMs: {
			...(requestUploadMs === undefined ? {} : { requestUploadMs }),
			...(responseWaitAfterUploadMs === undefined
				? {}
				: { responseWaitAfterUploadMs }),
			...(responseHeadersToFirstBodyByteMs === undefined
				? {}
				: { responseHeadersToFirstBodyByteMs }),
			...(responseDownloadMs === undefined ? {} : { responseDownloadMs }),
		},
		milestonesMs: {
			...(trace.requestCreatedMs === undefined
				? {}
				: { requestCreated: trace.requestCreatedMs }),
			...(trace.connectStartedMs === undefined
				? {}
				: { connectStarted: trace.connectStartedMs }),
			...(trace.connectedMs === undefined
				? {}
				: { connected: trace.connectedMs }),
			...(trace.headersSentMs === undefined
				? {}
				: { headersSent: trace.headersSentMs }),
			...(trace.requestBodySentMs === undefined
				? {}
				: { requestBodySent: trace.requestBodySentMs }),
			...(trace.responseHeadersMs === undefined
				? {}
				: { responseHeaders: trace.responseHeadersMs }),
			...(trace.firstResponseBodyChunkMs === undefined
				? {}
				: { firstResponseBodyChunk: trace.firstResponseBodyChunkMs }),
			...(trace.responseBodyCompleteMs === undefined
				? {}
				: { responseBodyComplete: trace.responseBodyCompleteMs }),
		},
	};
}
