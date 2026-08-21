export type RssMeasurement = {
	readonly baselineMedianBytes: number;
	readonly deltaBytes: number;
	readonly deltaMiB: number;
	readonly medianBytes: number;
	readonly samplesBytes: readonly number[];
};

export function median(samples: readonly number[]): number {
	if (samples.length === 0 || samples.length % 2 === 0) {
		throw new Error("RSS median requires a non-empty odd sample count.");
	}
	const ordered = [...samples].sort((left, right) => left - right);
	const value = ordered[Math.floor(ordered.length / 2)];
	if (value === undefined) throw new Error("RSS samples unexpectedly empty.");
	return value;
}

export function summarizeSamples(
	samplesBytes: readonly number[],
	baselineSamplesBytes: readonly number[],
	bytesPerMiB = 1024 * 1024,
): RssMeasurement {
	if (samplesBytes.length !== 5 || baselineSamplesBytes.length !== 5) {
		throw new Error(
			"The RSS benchmark contract requires five fresh processes.",
		);
	}
	const medianBytes = median(samplesBytes);
	const baselineMedianBytes = median(baselineSamplesBytes);
	const deltaBytes = medianBytes - baselineMedianBytes;
	return {
		baselineMedianBytes,
		deltaBytes,
		deltaMiB: Math.round((deltaBytes / bytesPerMiB) * 1000) / 1000,
		medianBytes,
		samplesBytes: [...samplesBytes],
	};
}
