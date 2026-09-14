/** Each operation owns its private validator roots; shared definitions load once. */
export function validationGroup(root: string): string {
	if (/^segment|^memberIndices|^intakeOutput/.test(root))
		return "segmentation";
	if (
		/^grammar\//.test(root) ||
		["lemmaSchema", "attestationSchema"].includes(root)
	)
		return "grammar";
	if (/^knowledge/.test(root)) return "knowledge";
	if (/^target\/|^classify|^encounter/.test(root)) return "targeting";
	if (/^emoji|^generationInput$|^comparisonInput$|^readingSchema$/.test(root))
		return "reading";
	throw new Error(`Unclassified Dumgen validation root: ${root}`);
}
