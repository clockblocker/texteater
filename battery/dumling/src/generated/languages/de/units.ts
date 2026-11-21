// Generated from canonical Zod unit schemas. Run bun run generate.
export interface UnitMap {
	"de/Foreign/Foreign": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Foreign";
			kind: "Foreign";
			canonicalForm: string;
			coreFeatures: { sourceLang: string };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Foreign";
				kind: "Foreign";
				canonicalForm: string;
				coreFeatures: { sourceLang: string };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Foreign";
				kind: "Foreign";
				canonicalForm: string;
				coreFeatures: { sourceLang: string };
			};
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Foreign";
					kind: "Foreign";
					canonicalForm: string;
					coreFeatures: { sourceLang: string };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: { comparable: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				degree: ("Cmp" | "Pos" | "Sup") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: { comparable: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					degree: ("Cmp" | "Pos" | "Sup") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Lexeme/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Lexeme/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: { comparable: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				degree: ("Cmp" | "Pos" | "Sup") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: { comparable: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/AUX": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "AUX";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "AUX";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
					  )
					| null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			expletiveEvidence:
				| (
						| {
								attested: string;
								orthography: "Standard" | "Typo" | "Shorthand";
						  }
						| {
								attested: string;
								orthography: "Fused";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Lexeme/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "CCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
				polite: "Form" | null;
				poss: "Yes" | null;
				pronType:
					| (
							| "Art"
							| "Dem"
							| "Ind"
							| "Int"
							| "Neg"
							| "Prs"
							| "Rel"
							| "Tot"
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					polite: "Form" | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Art"
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rel"
								| "Tot"
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				degree: ("Cmp" | "Pos" | "Sup") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				"gender[psor]":
					| (
							| ("Fem" | "Masc" | "Neut")
							| [
									"Fem" | "Masc" | "Neut",
									"Fem" | "Masc" | "Neut",
									...Array<"Fem" | "Masc" | "Neut">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				"number[psor]": ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					polite: "Form" | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Art"
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rel"
								| "Tot"
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: {
						case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
						gender: ("Fem" | "Masc" | "Neut") | null;
						number: ("Plur" | "Sing") | null;
						person: ("1" | "2" | "3") | null;
						polite: "Form" | null;
						poss: "Yes" | null;
						pronType:
							| (
									| "Art"
									| "Dem"
									| "Ind"
									| "Int"
									| "Neg"
									| "Prs"
									| "Rel"
									| "Tot"
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					degree: ("Cmp" | "Pos" | "Sup") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					"gender[psor]":
						| (
								| ("Fem" | "Masc" | "Neut")
								| [
										"Fem" | "Masc" | "Neut",
										"Fem" | "Masc" | "Neut",
										...Array<"Fem" | "Masc" | "Neut">,
								  ]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					"number[psor]": ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: { partType: "Res" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: { partType: "Res" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: { partType: "Res" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: { partType: "Res" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: {
				gender:
					| (
							| ("Fem" | "Masc" | "Neut")
							| {
									mixed: [
										"Fem" | "Masc" | "Neut",
										"Fem" | "Masc" | "Neut",
										...Array<"Fem" | "Masc" | "Neut">,
									];
							  }
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					gender:
						| (
								| ("Fem" | "Masc" | "Neut")
								| {
										mixed: [
											"Fem" | "Masc" | "Neut",
											"Fem" | "Masc" | "Neut",
											...Array<"Fem" | "Masc" | "Neut">,
										];
								  }
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					gender:
						| (
								| ("Fem" | "Masc" | "Neut")
								| {
										mixed: [
											"Fem" | "Masc" | "Neut",
											"Fem" | "Masc" | "Neut",
											...Array<"Fem" | "Masc" | "Neut">,
										];
								  }
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: {
						gender:
							| (
									| ("Fem" | "Masc" | "Neut")
									| {
											mixed: [
												"Fem" | "Masc" | "Neut",
												"Fem" | "Masc" | "Neut",
												...Array<
													"Fem" | "Masc" | "Neut"
												>,
											];
									  }
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Lexeme/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "NUM";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
		};
	};
	"de/Lexeme/PART": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PART";
			canonicalForm: string;
			coreFeatures: {
				partType: ("Inf" | "Mod") | null;
				polarity: "Neg" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					partType: ("Inf" | "Mod") | null;
					polarity: "Neg" | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					partType: ("Inf" | "Mod") | null;
					polarity: "Neg" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PART";
					canonicalForm: string;
					coreFeatures: {
						partType: ("Inf" | "Mod") | null;
						polarity: "Neg" | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
				polite: "Form" | null;
				poss: "Yes" | null;
				pronType:
					| (
							| "Dem"
							| "Ind"
							| "Int"
							| "Neg"
							| "Prs"
							| "Rcp"
							| "Rel"
							| "Tot"
					  )
					| null;
				gender: ("Fem" | "Masc" | "Neut") | null;
			};
			syncretic?:
				| [
						(
							| "case"
							| "number"
							| "person"
							| "polite"
							| "poss"
							| "pronType"
							| "gender"
						),
						...Array<
							| "case"
							| "number"
							| "person"
							| "polite"
							| "poss"
							| "pronType"
							| "gender"
						>,
				  ]
				| undefined;
			syncretized?:
				| [
						{
							unitKind: "Lemma";
							language: "de";
							family: "Lexeme";
							kind: "PRON";
							canonicalForm: string;
							coreFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								polite: "Form" | null;
								poss: "Yes" | null;
								pronType:
									| (
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
									  )
									| null;
								gender: ("Fem" | "Masc" | "Neut") | null;
							};
						},
						{
							unitKind: "Lemma";
							language: "de";
							family: "Lexeme";
							kind: "PRON";
							canonicalForm: string;
							coreFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								polite: "Form" | null;
								poss: "Yes" | null;
								pronType:
									| (
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
									  )
									| null;
								gender: ("Fem" | "Masc" | "Neut") | null;
							};
						},
						...Array<{
							unitKind: "Lemma";
							language: "de";
							family: "Lexeme";
							kind: "PRON";
							canonicalForm: string;
							coreFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								polite: "Form" | null;
								poss: "Yes" | null;
								pronType:
									| (
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
									  )
									| null;
								gender: ("Fem" | "Masc" | "Neut") | null;
							};
						}>,
				  ]
				| undefined;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					polite: "Form" | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rcp"
								| "Rel"
								| "Tot"
						  )
						| null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
				syncretic?:
					| [
							(
								| "case"
								| "number"
								| "person"
								| "polite"
								| "poss"
								| "pronType"
								| "gender"
							),
							...Array<
								| "case"
								| "number"
								| "person"
								| "polite"
								| "poss"
								| "pronType"
								| "gender"
							>,
					  ]
					| undefined;
				syncretized?:
					| [
							{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							},
							{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							},
							...Array<{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							}>,
					  ]
					| undefined;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
				"gender[psor]":
					| (
							| ("Fem" | "Masc" | "Neut")
							| [
									"Fem" | "Masc" | "Neut",
									"Fem" | "Masc" | "Neut",
									...Array<"Fem" | "Masc" | "Neut">,
							  ]
					  )
					| null;
				"number[psor]": ("Plur" | "Sing") | null;
			} | null;
			syncretic?:
				| [
						(
							| "case"
							| "gender"
							| "number"
							| "gender[psor]"
							| "number[psor]"
						),
						...Array<
							| "case"
							| "gender"
							| "number"
							| "gender[psor]"
							| "number[psor]"
						>,
				  ]
				| undefined;
			syncretized?:
				| [
						{
							unitKind: "Surface";
							language: "de";
							lemma: {
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
								syncretic?:
									| [
											(
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											),
											...Array<
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											>,
									  ]
									| undefined;
								syncretized?:
									| [
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											...Array<{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											}>,
									  ]
									| undefined;
							};
							normalizedSurface: string;
							spelling:
								| { kind: "Canonical" }
								| {
										kind: "Variant";
										variantTags: [
											(
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											),
											...Array<
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											>,
										];
								  };
							surfaceFeatures: {
								historicalStatus: "Archaic" | null;
							} | null;
							inflectionalFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								number: ("Plur" | "Sing") | null;
								"gender[psor]":
									| (
											| ("Fem" | "Masc" | "Neut")
											| [
													"Fem" | "Masc" | "Neut",
													"Fem" | "Masc" | "Neut",
													...Array<
														"Fem" | "Masc" | "Neut"
													>,
											  ]
									  )
									| null;
								"number[psor]": ("Plur" | "Sing") | null;
							} | null;
						},
						{
							unitKind: "Surface";
							language: "de";
							lemma: {
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
								syncretic?:
									| [
											(
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											),
											...Array<
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											>,
									  ]
									| undefined;
								syncretized?:
									| [
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											...Array<{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											}>,
									  ]
									| undefined;
							};
							normalizedSurface: string;
							spelling:
								| { kind: "Canonical" }
								| {
										kind: "Variant";
										variantTags: [
											(
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											),
											...Array<
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											>,
										];
								  };
							surfaceFeatures: {
								historicalStatus: "Archaic" | null;
							} | null;
							inflectionalFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								number: ("Plur" | "Sing") | null;
								"gender[psor]":
									| (
											| ("Fem" | "Masc" | "Neut")
											| [
													"Fem" | "Masc" | "Neut",
													"Fem" | "Masc" | "Neut",
													...Array<
														"Fem" | "Masc" | "Neut"
													>,
											  ]
									  )
									| null;
								"number[psor]": ("Plur" | "Sing") | null;
							} | null;
						},
						...Array<{
							unitKind: "Surface";
							language: "de";
							lemma: {
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
								syncretic?:
									| [
											(
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											),
											...Array<
												| "case"
												| "number"
												| "person"
												| "polite"
												| "poss"
												| "pronType"
												| "gender"
											>,
									  ]
									| undefined;
								syncretized?:
									| [
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											},
											...Array<{
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "PRON";
												canonicalForm: string;
												coreFeatures: {
													case:
														| (
																| "Acc"
																| "Dat"
																| "Gen"
																| "Nom"
														  )
														| null;
													number:
														| ("Plur" | "Sing")
														| null;
													person:
														| ("1" | "2" | "3")
														| null;
													polite: "Form" | null;
													poss: "Yes" | null;
													pronType:
														| (
																| "Dem"
																| "Ind"
																| "Int"
																| "Neg"
																| "Prs"
																| "Rcp"
																| "Rel"
																| "Tot"
														  )
														| null;
													gender:
														| (
																| "Fem"
																| "Masc"
																| "Neut"
														  )
														| null;
												};
											}>,
									  ]
									| undefined;
							};
							normalizedSurface: string;
							spelling:
								| { kind: "Canonical" }
								| {
										kind: "Variant";
										variantTags: [
											(
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											),
											...Array<
												| "Licensed"
												| "Historical"
												| "Regional"
												| "Expressive"
											>,
										];
								  };
							surfaceFeatures: {
								historicalStatus: "Archaic" | null;
							} | null;
							inflectionalFeatures: {
								case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								number: ("Plur" | "Sing") | null;
								"gender[psor]":
									| (
											| ("Fem" | "Masc" | "Neut")
											| [
													"Fem" | "Masc" | "Neut",
													"Fem" | "Masc" | "Neut",
													...Array<
														"Fem" | "Masc" | "Neut"
													>,
											  ]
									  )
									| null;
								"number[psor]": ("Plur" | "Sing") | null;
							} | null;
						}>,
				  ]
				| undefined;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					polite: "Form" | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rcp"
								| "Rel"
								| "Tot"
						  )
						| null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
				syncretic?:
					| [
							(
								| "case"
								| "number"
								| "person"
								| "polite"
								| "poss"
								| "pronType"
								| "gender"
							),
							...Array<
								| "case"
								| "number"
								| "person"
								| "polite"
								| "poss"
								| "pronType"
								| "gender"
							>,
					  ]
					| undefined;
				syncretized?:
					| [
							{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							},
							{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							},
							...Array<{
								unitKind: "Lemma";
								language: "de";
								family: "Lexeme";
								kind: "PRON";
								canonicalForm: string;
								coreFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									polite: "Form" | null;
									poss: "Yes" | null;
									pronType:
										| (
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
										  )
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
								};
							}>,
					  ]
					| undefined;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: {
						case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
						number: ("Plur" | "Sing") | null;
						person: ("1" | "2" | "3") | null;
						polite: "Form" | null;
						poss: "Yes" | null;
						pronType:
							| (
									| "Dem"
									| "Ind"
									| "Int"
									| "Neg"
									| "Prs"
									| "Rcp"
									| "Rel"
									| "Tot"
							  )
							| null;
						gender: ("Fem" | "Masc" | "Neut") | null;
					};
					syncretic?:
						| [
								(
									| "case"
									| "number"
									| "person"
									| "polite"
									| "poss"
									| "pronType"
									| "gender"
								),
								...Array<
									| "case"
									| "number"
									| "person"
									| "polite"
									| "poss"
									| "pronType"
									| "gender"
								>,
						  ]
						| undefined;
					syncretized?:
						| [
								{
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
								},
								{
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
								},
								...Array<{
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
								}>,
						  ]
						| undefined;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					"gender[psor]":
						| (
								| ("Fem" | "Masc" | "Neut")
								| [
										"Fem" | "Masc" | "Neut",
										"Fem" | "Masc" | "Neut",
										...Array<"Fem" | "Masc" | "Neut">,
								  ]
						  )
						| null;
					"number[psor]": ("Plur" | "Sing") | null;
				} | null;
				syncretic?:
					| [
							(
								| "case"
								| "gender"
								| "number"
								| "gender[psor]"
								| "number[psor]"
							),
							...Array<
								| "case"
								| "gender"
								| "number"
								| "gender[psor]"
								| "number[psor]"
							>,
					  ]
					| undefined;
				syncretized?:
					| [
							{
								unitKind: "Surface";
								language: "de";
								lemma: {
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
									syncretic?:
										| [
												(
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												),
												...Array<
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												>,
										  ]
										| undefined;
									syncretized?:
										| [
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												...Array<{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												}>,
										  ]
										| undefined;
								};
								normalizedSurface: string;
								spelling:
									| { kind: "Canonical" }
									| {
											kind: "Variant";
											variantTags: [
												(
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												),
												...Array<
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												>,
											];
									  };
								surfaceFeatures: {
									historicalStatus: "Archaic" | null;
								} | null;
								inflectionalFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									number: ("Plur" | "Sing") | null;
									"gender[psor]":
										| (
												| ("Fem" | "Masc" | "Neut")
												| [
														"Fem" | "Masc" | "Neut",
														"Fem" | "Masc" | "Neut",
														...Array<
															| "Fem"
															| "Masc"
															| "Neut"
														>,
												  ]
										  )
										| null;
									"number[psor]": ("Plur" | "Sing") | null;
								} | null;
							},
							{
								unitKind: "Surface";
								language: "de";
								lemma: {
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
									syncretic?:
										| [
												(
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												),
												...Array<
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												>,
										  ]
										| undefined;
									syncretized?:
										| [
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												...Array<{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												}>,
										  ]
										| undefined;
								};
								normalizedSurface: string;
								spelling:
									| { kind: "Canonical" }
									| {
											kind: "Variant";
											variantTags: [
												(
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												),
												...Array<
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												>,
											];
									  };
								surfaceFeatures: {
									historicalStatus: "Archaic" | null;
								} | null;
								inflectionalFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									number: ("Plur" | "Sing") | null;
									"gender[psor]":
										| (
												| ("Fem" | "Masc" | "Neut")
												| [
														"Fem" | "Masc" | "Neut",
														"Fem" | "Masc" | "Neut",
														...Array<
															| "Fem"
															| "Masc"
															| "Neut"
														>,
												  ]
										  )
										| null;
									"number[psor]": ("Plur" | "Sing") | null;
								} | null;
							},
							...Array<{
								unitKind: "Surface";
								language: "de";
								lemma: {
									unitKind: "Lemma";
									language: "de";
									family: "Lexeme";
									kind: "PRON";
									canonicalForm: string;
									coreFeatures: {
										case:
											| ("Acc" | "Dat" | "Gen" | "Nom")
											| null;
										number: ("Plur" | "Sing") | null;
										person: ("1" | "2" | "3") | null;
										polite: "Form" | null;
										poss: "Yes" | null;
										pronType:
											| (
													| "Dem"
													| "Ind"
													| "Int"
													| "Neg"
													| "Prs"
													| "Rcp"
													| "Rel"
													| "Tot"
											  )
											| null;
										gender:
											| ("Fem" | "Masc" | "Neut")
											| null;
									};
									syncretic?:
										| [
												(
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												),
												...Array<
													| "case"
													| "number"
													| "person"
													| "polite"
													| "poss"
													| "pronType"
													| "gender"
												>,
										  ]
										| undefined;
									syncretized?:
										| [
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												},
												...Array<{
													unitKind: "Lemma";
													language: "de";
													family: "Lexeme";
													kind: "PRON";
													canonicalForm: string;
													coreFeatures: {
														case:
															| (
																	| "Acc"
																	| "Dat"
																	| "Gen"
																	| "Nom"
															  )
															| null;
														number:
															| ("Plur" | "Sing")
															| null;
														person:
															| ("1" | "2" | "3")
															| null;
														polite: "Form" | null;
														poss: "Yes" | null;
														pronType:
															| (
																	| "Dem"
																	| "Ind"
																	| "Int"
																	| "Neg"
																	| "Prs"
																	| "Rcp"
																	| "Rel"
																	| "Tot"
															  )
															| null;
														gender:
															| (
																	| "Fem"
																	| "Masc"
																	| "Neut"
															  )
															| null;
													};
												}>,
										  ]
										| undefined;
								};
								normalizedSurface: string;
								spelling:
									| { kind: "Canonical" }
									| {
											kind: "Variant";
											variantTags: [
												(
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												),
												...Array<
													| "Licensed"
													| "Historical"
													| "Regional"
													| "Expressive"
												>,
											];
									  };
								surfaceFeatures: {
									historicalStatus: "Archaic" | null;
								} | null;
								inflectionalFeatures: {
									case:
										| ("Acc" | "Dat" | "Gen" | "Nom")
										| null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									number: ("Plur" | "Sing") | null;
									"gender[psor]":
										| (
												| ("Fem" | "Masc" | "Neut")
												| [
														"Fem" | "Masc" | "Neut",
														"Fem" | "Masc" | "Neut",
														...Array<
															| "Fem"
															| "Masc"
															| "Neut"
														>,
												  ]
										  )
										| null;
									"number[psor]": ("Plur" | "Sing") | null;
								} | null;
							}>,
					  ]
					| undefined;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
		};
	};
	"de/Lexeme/PROPN": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PROPN";
			canonicalForm: string;
			coreFeatures: {
				article: "Definite" | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					article: "Definite" | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					article: "Definite" | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PROPN";
					canonicalForm: string;
					coreFeatures: {
						article: "Definite" | null;
						gender: ("Fem" | "Masc" | "Neut") | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
		};
	};
	"de/Lexeme/PUNCT": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PUNCT";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PUNCT";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/SYM": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "SYM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "SYM";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: { hasSepPrefix: string | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: { hasSepPrefix: string | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
					  )
					| null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			expletiveEvidence:
				| (
						| {
								attested: string;
								orthography: "Standard" | "Typo" | "Shorthand";
						  }
						| {
								attested: string;
								orthography: "Fused";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Locution/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: { comparable: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				degree: ("Cmp" | "Pos" | "Sup") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: { comparable: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					degree: ("Cmp" | "Pos" | "Sup") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Locution/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Locution/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: { comparable: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				degree: ("Cmp" | "Pos" | "Sup") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: { comparable: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "CCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: { gender: ("Fem" | "Masc" | "Neut") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: { gender: ("Fem" | "Masc" | "Neut") | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: { gender: ("Fem" | "Masc" | "Neut") | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: { gender: ("Fem" | "Masc" | "Neut") | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence?:
				| (
						| (
								| { kind: "Owned"; member: number }
								| {
										kind: "Shared";
										article:
											| {
													attested: string;
													orthography:
														| "Standard"
														| "Typo"
														| "Shorthand";
											  }
											| {
													attested: string;
													orthography: "Fused";
													fusion: {
														spelling: string;
														components: [
															{
																span: string;
																surface: string;
															},
															{
																span: string;
																surface: string;
															},
															...Array<{
																span: string;
																surface: string;
															}>,
														];
													};
													component: number;
											  };
								  }
								| {
										kind: "Hidden";
										fusion: {
											spelling: string;
											components: [
												{
													span: string;
													surface: string;
												},
												{
													span: string;
													surface: string;
												},
												...Array<{
													span: string;
													surface: string;
												}>,
											];
										};
										component: number;
								  }
						  )
						| null
				  )
				| undefined;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Locution/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "NUM";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Locution/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Locution";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Inf";
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: null;
								passive: null;
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Pass";
								passive: "Process" | "Recipient";
						  }
						| {
								mood: null;
								number: null;
								person: null;
								tense: null;
								verbForm: "Part";
								participleForm: ("Present" | "Past") | null;
								expletive: "Subject" | null;
								perfect: "Yes" | null;
								future: "Yes" | null;
								voice: "Cau";
								passive: null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Locution";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Locution";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Inf";
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: null;
									passive: null;
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Pass";
									passive: "Process" | "Recipient";
							  }
							| {
									mood: null;
									number: null;
									person: null;
									tense: null;
									verbForm: "Part";
									participleForm: ("Present" | "Past") | null;
									expletive: "Subject" | null;
									perfect: "Yes" | null;
									future: "Yes" | null;
									voice: "Cau";
									passive: null;
							  }
					  )
					| null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			expletiveEvidence:
				| (
						| {
								attested: string;
								orthography: "Standard" | "Typo" | "Shorthand";
						  }
						| {
								attested: string;
								orthography: "Fused";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence: Array<
				| {
						member: number | null;
						complement:
							| {
									kind: "Case";
									governedCase: "Nom" | "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
									};
									governedCase: "Acc" | "Dat" | "Gen";
							  }
							| {
									kind: "Reflexive";
									governedCase: "Acc" | "Dat";
									preposition?:
										| {
												unitKind: "Lemma";
												language: "de";
												family: "Lexeme";
												kind: "ADP";
												canonicalForm: string;
												coreFeatures: Record<
													string,
													never
												>;
										  }
										| undefined;
							  };
						realizedCase: "Nom" | "Acc" | "Dat" | "Gen";
				  }
				| {
						member: number | null;
						complement: {
							kind: "Reflexive";
							preposition?:
								| {
										unitKind: "Lemma";
										language: "de";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: Record<string, never>;
								  }
								| undefined;
						};
				  }
			>;
		};
	};
	"de/Morpheme/Circumfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Circumfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Circumfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Duplifix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Duplifix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Duplifix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Ending": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Ending";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Ending";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Ending";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Ending";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Infix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Infix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Infix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Interfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Interfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Interfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Prefix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Prefix";
			canonicalForm: string;
			coreFeatures: { hasSepPrefix: string | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Prefix";
					canonicalForm: string;
					coreFeatures: { hasSepPrefix: string | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Root": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Root";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Root";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Suffix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Suffix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Suffix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Suffixoid": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Suffixoid";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Suffixoid";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Saying/Saying": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Saying";
			kind: "Saying";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Saying";
				kind: "Saying";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Saying";
				kind: "Saying";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Saying";
					kind: "Saying";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
}
