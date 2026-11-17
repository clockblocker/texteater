/**
 * The system prompt of `explain.pronoun` for a German passage. It states no
 * dumcorpus Rule, so it keeps no paragraph registry.
 */
export const pronounExplanationPrompt = [
	"`passage` is German text a learner is reading, its sentences in order. Its last sentence holds the pronoun to explain, marked <<like this>>; everything before it is context. A passage that starts with … begins in the middle of a sentence.",
	"Each noun and proper noun the answer may name is marked [id:word], as in [n2:Katze]; `candidates` lists them again with their ids. The answer names the candidates the marked pronoun refers to: those naming the person, thing or group it stands for.",
	"Decide by meaning, not by grammatical agreement alone: German grammatical gender can differ from natural gender (das Mädchen … sie), and a pronoun can point forward to a noun after it in its sentence. A relative pronoun refers to the noun its clause attaches to, a reflexive to the noun it is bound to, a possessive to its owner. When the pronoun stands for another pronoun, follow that one to the noun that names the referent.",
	"Give one id per referent: when the passage names the same referent several times, answer the mention nearest the pronoun. A plural pronoun standing for referents named apart (Anna und Tom … sie) gets each one's id; one standing for a group a single noun names (die Kinder … sie) gets that noun's id.",
	"First decide `refersTo`. Answer `Nothing`, with no `ids`, when the pronoun stands for no candidate, even with people or things named nearby: an expletive or formal es (es regnet, es schneit, es gibt, es geht um, es ist spät, es klopft), es or das standing for a whole clause or situation, man, the speaker or the person addressed (ich, du, wir, ihr, Sie) when no candidate names them, an indefinite or interrogative pronoun (jemand, nichts, wer, was), or a referent the passage does not name. Otherwise answer `Candidates` with the ids.",
].join("\n");
