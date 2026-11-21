// Generated from canonical Zod unit schemas. Run bun run generate.
export interface UnitMap {
	"he/Foreign/Foreign": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Foreign";
			kind: "Foreign";
			canonicalForm: string;
			coreFeatures: { sourceLang: string };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Lexeme/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: { abbr: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null };
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
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: { abbr: "Yes" | null };
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
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
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
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "he";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											case: ("Acc" | "Gen") | null;
										};
									};
							  };
				  }>
				| undefined;
		};
	};
	"he/Lexeme/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: { abbr: "Yes" | null; case: ("Acc" | "Gen") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					case: ("Acc" | "Gen") | null;
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
				language: "he";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					case: ("Acc" | "Gen") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						case: ("Acc" | "Gen") | null;
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
	"he/Lexeme/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: { prefix: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { prefix: "Yes" | null };
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
				language: "he";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { prefix: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: { prefix: "Yes" | null };
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
	"he/Lexeme/AUX": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "AUX";
			canonicalForm: string;
			coreFeatures: { verbType: ("Cop" | "Mod") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: ("Cop" | "Mod") | null };
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
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				person:
					| (
							| ("1" | "2" | "3")
							| [
									"1" | "2" | "3",
									"1" | "2" | "3",
									...Array<"1" | "2" | "3">,
							  ]
					  )
					| null;
				polarity: ("Neg" | "Pos") | null;
				tense: ("Fut" | "Past") | null;
				verbForm: ("Inf" | "Part") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: ("Cop" | "Mod") | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "AUX";
					canonicalForm: string;
					coreFeatures: { verbType: ("Cop" | "Mod") | null };
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
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					person:
						| (
								| ("1" | "2" | "3")
								| [
										"1" | "2" | "3",
										"1" | "2" | "3",
										...Array<"1" | "2" | "3">,
								  ]
						  )
						| null;
					polarity: ("Neg" | "Pos") | null;
					tense: ("Fut" | "Past") | null;
					verbForm: ("Inf" | "Part") | null;
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
	"he/Lexeme/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Lexeme/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: { pronType: ("Art" | "Int") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: { pronType: ("Art" | "Int") | null };
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
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: { pronType: ("Art" | "Int") | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: { pronType: ("Art" | "Int") | null };
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
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
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
	"he/Lexeme/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
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
				language: "he";
				family: "Lexeme";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
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
	"he/Lexeme/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
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
				definite: ("Cons" | "Def" | "Ind") | null;
				number:
					| (
							| ("Dual" | "Plur" | "Sing")
							| [
									"Dual" | "Plur" | "Sing",
									"Dual" | "Plur" | "Sing",
									...Array<"Dual" | "Plur" | "Sing">,
							  ]
					  )
					| null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						gender:
							| (
									| ("Fem" | "Masc")
									| [
											"Fem" | "Masc",
											"Fem" | "Masc",
											...Array<"Fem" | "Masc">,
									  ]
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
					definite: ("Cons" | "Def" | "Ind") | null;
					number:
						| (
								| ("Dual" | "Plur" | "Sing")
								| [
										"Dual" | "Plur" | "Sing",
										"Dual" | "Plur" | "Sing",
										...Array<"Dual" | "Plur" | "Sing">,
								  ]
						  )
						| null;
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
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "he";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											case: ("Acc" | "Gen") | null;
										};
									};
							  };
				  }>
				| undefined;
		};
	};
	"he/Lexeme/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				number:
					| (
							| ("Dual" | "Plur")
							| [
									"Dual" | "Plur",
									"Dual" | "Plur",
									...Array<"Dual" | "Plur">,
							  ]
					  )
					| null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
					number:
						| (
								| ("Dual" | "Plur")
								| [
										"Dual" | "Plur",
										"Dual" | "Plur",
										...Array<"Dual" | "Plur">,
								  ]
						  )
						| null;
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
	"he/Lexeme/PART": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PART";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PART";
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
				language: "he";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PART";
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
	"he/Lexeme/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: {
				definite: "Def" | null;
				pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
				reflex: "Yes" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					definite: "Def" | null;
					pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
					reflex: "Yes" | null;
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
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					definite: "Def" | null;
					pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
					reflex: "Yes" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: {
						definite: "Def" | null;
						pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
						reflex: "Yes" | null;
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
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
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
	"he/Lexeme/PROPN": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PROPN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				article: "Definite" | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					article: "Definite" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
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
			inflectionalFeatures: { number: ("Plur" | "Sing") | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					article: "Definite" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PROPN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						article: "Definite" | null;
						gender:
							| (
									| ("Fem" | "Masc")
									| [
											"Fem" | "Masc",
											"Fem" | "Masc",
											...Array<"Fem" | "Masc">,
									  ]
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
	"he/Lexeme/PUNCT": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PUNCT";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Lexeme/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: { case: "Tem" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { case: "Tem" | null };
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
				language: "he";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { case: "Tem" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: { case: "Tem" | null };
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
	"he/Lexeme/SYM": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "SYM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Lexeme/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: {
				hebBinyan:
					| (
							| "HIFIL"
							| "HITPAEL"
							| "HUFAL"
							| "NIFAL"
							| "PAAL"
							| "PIEL"
							| "PUAL"
					  )
					| null;
				hebExistential: "Yes" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hebBinyan:
						| (
								| "HIFIL"
								| "HITPAEL"
								| "HUFAL"
								| "NIFAL"
								| "PAAL"
								| "PIEL"
								| "PUAL"
						  )
						| null;
					hebExistential: "Yes" | null;
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
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| [
									"Fem" | "Masc",
									"Fem" | "Masc",
									...Array<"Fem" | "Masc">,
							  ]
					  )
					| null;
				mood: "Imp" | null;
				number: ("Plur" | "Sing") | null;
				person:
					| (
							| ("1" | "2" | "3")
							| [
									"1" | "2" | "3",
									"1" | "2" | "3",
									...Array<"1" | "2" | "3">,
							  ]
					  )
					| null;
				polarity: ("Neg" | "Pos") | null;
				tense: ("Fut" | "Past") | null;
				verbForm: ("Inf" | "Part") | null;
				voice: ("Act" | "Mid" | "Pass") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hebBinyan:
						| (
								| "HIFIL"
								| "HITPAEL"
								| "HUFAL"
								| "NIFAL"
								| "PAAL"
								| "PIEL"
								| "PUAL"
						  )
						| null;
					hebExistential: "Yes" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: {
						hebBinyan:
							| (
									| "HIFIL"
									| "HITPAEL"
									| "HUFAL"
									| "NIFAL"
									| "PAAL"
									| "PIEL"
									| "PUAL"
							  )
							| null;
						hebExistential: "Yes" | null;
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
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| [
										"Fem" | "Masc",
										"Fem" | "Masc",
										...Array<"Fem" | "Masc">,
								  ]
						  )
						| null;
					mood: "Imp" | null;
					number: ("Plur" | "Sing") | null;
					person:
						| (
								| ("1" | "2" | "3")
								| [
										"1" | "2" | "3",
										"1" | "2" | "3",
										...Array<"1" | "2" | "3">,
								  ]
						  )
						| null;
					polarity: ("Neg" | "Pos") | null;
					tense: ("Fut" | "Past") | null;
					verbForm: ("Inf" | "Part") | null;
					voice: ("Act" | "Mid" | "Pass") | null;
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
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "he";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											case: ("Acc" | "Gen") | null;
										};
									};
							  };
				  }>
				| undefined;
		};
	};
	"he/Locution/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Locution";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Locution";
				kind: "ADV";
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
				language: "he";
				family: "Locution";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Locution";
					kind: "ADV";
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
	"he/Locution/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Locution";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Circumfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Circumfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Duplifix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Duplifix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Infix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Infix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Interfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Interfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Prefix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Prefix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Prefix";
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
				language: "he";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Prefix";
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
	"he/Morpheme/Root": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Root";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Suffix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Suffix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Suffixoid": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Suffixoid";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
	"he/Morpheme/Transfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Transfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Transfix";
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
				language: "he";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Transfix";
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
	"he/Saying/Saying": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Saying";
			kind: "Saying";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
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
				language: "he";
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
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
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
