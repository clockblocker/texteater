import { NoteSection } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";

/**
 * The Fusion Block: every fused word this Attestation holds a piece of, or
 * whose hidden component it owns (ADR 0035), broken down into the words it
 * stands for (`im = in + dem`). The components this Attestation realizes are
 * marked; the others belong to a neighbouring Attestation.
 */
export const renderDefaultAttestationFusion = (({ noteData }) => {
	const { fusions } = noteData.presented;
	if (fusions.length === 0) return null;
	return (
		<NoteSection aria-label="Fusion" label="Fusion">
			<ul className="grid gap-3">
				{fusions.map((fusion) => (
					<li key={JSON.stringify(fusion.components)}>
						<p data-fusion-breakdown="" className="text-ink">
							<span className="font-medium">
								{fusion.spelling}
							</span>
							{" = "}
							{fusion.components.map((component, position) => (
								<span key={`${position}:${component.span}`}>
									{position > 0 ? " + " : null}
									<span
										data-realized={
											fusion.realized.includes(
												position,
											) || undefined
										}
										className={
											fusion.realized.includes(position)
												? "font-medium underline decoration-dotted underline-offset-4"
												: "text-ink-muted"
										}
									>
										{component.surface}
									</span>
								</span>
							))}
						</p>
						{fusion.oneLiner ? (
							<p className="mt-1 text-sm text-ink-muted">
								{fusion.oneLiner}
							</p>
						) : null}
					</li>
				))}
			</ul>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
