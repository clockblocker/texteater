/** Shared phonetic transcription treatment for any language-specific header. */
export function Ipa({ transcription }: { readonly transcription: string }) {
	return <span className="reading-note__ipa">/{transcription}/</span>;
}
