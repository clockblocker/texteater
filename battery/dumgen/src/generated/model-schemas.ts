// Generated private model exchange schemas.
export const modelSchemas: Readonly<Record<string, Record<string, unknown>>> = {
	emojiOutput: {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: { emojiDescription: { type: "string", minLength: 1 } },
		required: ["emojiDescription"],
		additionalProperties: false,
	},
	intakeOutput: {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			language: {
				anyOf: [
					{ type: "string", enum: ["de", "he"] },
					{ type: "null" },
				],
			},
			items: {
				type: "array",
				items: {
					type: "object",
					properties: {
						id: { type: "string" },
						decision: {
							type: "string",
							enum: [
								"Accepted",
								"UnsupportedLanguage",
								"Unintelligible",
							],
						},
						language: {
							anyOf: [
								{ type: "string", enum: ["de", "he"] },
								{ type: "null" },
							],
						},
						stitchedText: { type: "string", minLength: 1 },
					},
					required: ["id", "decision", "language", "stitchedText"],
					additionalProperties: false,
				},
			},
		},
		required: ["language", "items"],
		additionalProperties: false,
	},
	knowledgeOutput: {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			transcription: {
				anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
			},
			definition: {
				anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
			},
			translations: {
				type: "object",
				properties: {
					en: {
						anyOf: [
							{ type: "string", minLength: 1 },
							{ type: "null" },
						],
					},
				},
				additionalProperties: false,
			},
			semanticRelations: {
				type: "object",
				properties: {
					synonym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
					nearSynonym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
					antonym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
					nearAntonym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
					hypernym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
					holonym: {
						anyOf: [
							{
								type: "array",
								items: {
									type: "object",
									properties: {
										canonicalForm: {
											type: "string",
											minLength: 1,
										},
										kind: { type: "string", minLength: 1 },
									},
									required: ["canonicalForm", "kind"],
									additionalProperties: false,
								},
							},
							{ type: "null" },
						],
					},
				},
				additionalProperties: false,
			},
		},
		additionalProperties: false,
	},
	"grammar/de/Construction/Fusion": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Ord"],
											},
											{ type: "null" },
										],
									},
									variant: {
										anyOf: [
											{ type: "string", enum: ["Short"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"numType",
									"variant",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"degree",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									adpType: {
										anyOf: [
											{
												type: "string",
												enum: ["Circ", "Post", "Prep"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									governedCase: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Acc",
													"Abe",
													"Ben",
													"Cau",
													"Cmp",
													"Cns",
													"Com",
													"Dat",
													"Dis",
													"Equ",
													"Gen",
													"Ins",
													"Par",
													"Tem",
													"Abl",
													"Add",
													"Ade",
													"All",
													"Del",
													"Ela",
													"Ess",
													"Ill",
													"Ine",
													"Lat",
													"Loc",
													"Nom",
													"Per",
													"Sbe",
													"Sbl",
													"Spl",
													"Sub",
													"Sup",
													"Ter",
												],
											},
											{ type: "null" },
										],
									},
									partType: {
										anyOf: [
											{ type: "string", enum: ["Vbp"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"adpType",
									"extPos",
									"foreign",
									"governedCase",
									"partType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Mult"],
											},
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Neg",
													"Rel",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["foreign", "numType", "pronType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									verbType: {
										anyOf: [
											{ type: "string", enum: ["Mod"] },
											{ type: "null" },
										],
									},
								},
								required: ["verbType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: { type: "null" },
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"number",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													aspect: {
														anyOf: [
															{
																type: "string",
																enum: ["Perf"],
															},
															{ type: "null" },
														],
													},
													gender: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{ type: "null" },
														],
													},
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"aspect",
													"gender",
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									conjType: {
										anyOf: [
											{ type: "string", enum: ["Comp"] },
											{ type: "null" },
										],
									},
								},
								required: ["conjType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									definite: {
										anyOf: [
											{
												type: "string",
												enum: ["Def", "Ind"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "DET"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Ord"],
											},
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									polite: {
										anyOf: [
											{
												type: "string",
												enum: ["Form", "Infm"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Art",
													"Dem",
													"Emp",
													"Exc",
													"Ind",
													"Int",
													"Neg",
													"Prs",
													"Rel",
													"Tot",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"definite",
									"extPos",
									"foreign",
									"numType",
									"person",
									"polite",
									"poss",
									"pronType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											"gender[psor]": {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																			"Neut",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																		"Neut",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											"number[psor]": {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"degree",
											"gender",
											"gender[psor]",
											"number",
											"number[psor]",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									partType: {
										anyOf: [
											{ type: "string", enum: ["Res"] },
											{ type: "null" },
										],
									},
								},
								required: ["partType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									hyph: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["gender", "hyph"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Card",
													"Frac",
													"Mult",
													"Range",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "foreign", "numType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "gender", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									hyph: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Mult", "Range"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"hyph",
									"numType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"gender",
											"mood",
											"number",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									partType: {
										anyOf: [
											{ type: "string", enum: ["Inf"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{
												type: "string",
												enum: ["Neg", "Pos"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"partType",
									"polarity",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									case: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Acc",
													"Dat",
													"Gen",
													"Nom",
												],
											},
											{ type: "null" },
										],
									},
									number: {
										anyOf: [
											{
												type: "string",
												enum: ["Plur", "Sing"],
											},
											{ type: "null" },
										],
									},
									"gender[psor]": {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["DET"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									polite: {
										anyOf: [
											{
												type: "string",
												enum: ["Form", "Infm"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Neg",
													"Prs",
													"Rcp",
													"Rel",
													"Tot",
												],
											},
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									referenceNumber: {
										anyOf: [
											{
												type: "string",
												enum: ["Plur", "Sing"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"case",
									"number",
									"gender[psor]",
									"extPos",
									"foreign",
									"person",
									"polite",
									"poss",
									"pronType",
									"gender",
									"referenceNumber",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											reflex: {
												anyOf: [
													{
														type: "string",
														enum: ["Yes"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["reflex"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "foreign", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									punctType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Brck",
													"Colo",
													"Comm",
													"Dash",
													"Elip",
													"Excl",
													"Peri",
													"Qest",
													"Quot",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["punctType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									conjType: {
										anyOf: [
											{ type: "string", enum: ["Comp"] },
											{ type: "null" },
										],
									},
								},
								required: ["conjType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Range"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["foreign", "numType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "gender", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hasGovPrep: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
									hasSepPrefix: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
									lexicallyReflexive: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									verbType: {
										anyOf: [
											{ type: "string", enum: ["Mod"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"hasGovPrep",
									"hasSepPrefix",
									"lexicallyReflexive",
									"verbType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: { type: "null" },
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"number",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													aspect: {
														anyOf: [
															{
																type: "string",
																enum: ["Perf"],
															},
															{ type: "null" },
														],
													},
													gender: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{ type: "null" },
														],
													},
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"aspect",
													"gender",
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Clitic": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hasSepPrefix: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
								},
								required: ["hasSepPrefix"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Collocation": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: { type: "null" },
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"number",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													aspect: {
														anyOf: [
															{
																type: "string",
																enum: ["Perf"],
															},
															{ type: "null" },
														],
													},
													gender: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{ type: "null" },
														],
													},
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"aspect",
													"gender",
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									discourseFormulaRole: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Greeting",
													"Farewell",
													"Apology",
													"Thanks",
													"Acknowledgment",
													"Refusal",
													"Request",
													"Reaction",
													"Initiation",
													"Transition",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["discourseFormulaRole"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: { type: "null" },
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"number",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													aspect: {
														anyOf: [
															{
																type: "string",
																enum: ["Perf"],
															},
															{ type: "null" },
														],
													},
													gender: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{ type: "null" },
														],
													},
													mood: { type: "null" },
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: { type: "null" },
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													voice: {
														anyOf: [
															{
																type: "string",
																enum: ["Pass"],
															},
															{ type: "null" },
														],
													},
												},
												required: [
													"aspect",
													"gender",
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"voice",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Construction/Fusion": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: ["Combi", "Word"],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Frac", "Ord"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: [
													"ADP",
													"ADV",
													"CCONJ",
													"SCONJ",
												],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{ type: "string", enum: ["Word"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Frac", "Mult", "Ord"],
											},
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Dem",
															"Ind",
															"Int",
															"Neg",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Dem",
																	"Ind",
																	"Int",
																	"Neg",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Dem",
																"Ind",
																"Int",
																"Neg",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Slng"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
									"pronType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Arch", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Past", "Pres"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"mood",
											"number",
											"person",
											"tense",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{ type: "string", enum: ["Neg"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "polarity"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									definite: {
										anyOf: [
											{
												type: "string",
												enum: ["Def", "Ind"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PRON"],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{ type: "string", enum: ["Word"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{ type: "string", enum: ["Frac"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Art",
															"Dem",
															"Ind",
															"Int",
															"Neg",
															"Rcp",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Art",
																	"Dem",
																	"Ind",
																	"Int",
																	"Neg",
																	"Rcp",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Art",
																"Dem",
																"Ind",
																"Int",
																"Neg",
																"Rcp",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Vrnc"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"definite",
									"extPos",
									"numForm",
									"numType",
									"pronType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{
												type: "string",
												enum: ["Neg", "Pos"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"polarity",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PROPN"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Combi",
													"Digit",
													"Word",
												],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Frac", "Ord"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"foreign",
									"numForm",
									"numType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Plur",
															"Ptan",
															"Sing",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Digit",
													"Roman",
													"Word",
												],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Frac"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["extPos", "foreign"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["CCONJ"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{ type: "string", enum: ["Neg"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "polarity"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PRON"],
											},
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Dem",
															"Emp",
															"Ind",
															"Int",
															"Neg",
															"Prs",
															"Rcp",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Dem",
																	"Emp",
																	"Ind",
																	"Int",
																	"Neg",
																	"Prs",
																	"Rcp",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Dem",
																"Emp",
																"Ind",
																"Int",
																"Neg",
																"Prs",
																"Rcp",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Arch",
													"Coll",
													"Expr",
													"Slng",
													"Vrnc",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"person",
									"poss",
									"pronType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											reflex: {
												anyOf: [
													{
														type: "string",
														enum: ["Yes"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"gender",
											"number",
											"reflex",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Plur",
															"Ptan",
															"Sing",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Vrnc"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "PROPN"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "CCONJ", "PROPN"],
											},
											{ type: "null" },
										],
									},
									hasGovPrep: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
									phrasal: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"hasGovPrep",
									"phrasal",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Past", "Pres"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Ger",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
											voice: {
												anyOf: [
													{
														type: "string",
														enum: ["Pass"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"mood",
											"number",
											"person",
											"tense",
											"verbForm",
											"voice",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Clitic": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/ToneMarking": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									discourseFormulaRole: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Greeting",
													"Farewell",
													"Apology",
													"Thanks",
													"Acknowledgment",
													"Refusal",
													"Request",
													"Reaction",
													"Initiation",
													"Transition",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["discourseFormulaRole"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Construction/Fusion": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									case: {
										anyOf: [
											{
												type: "string",
												enum: ["Acc", "Gen"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "case"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									prefix: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["prefix"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									verbType: {
										anyOf: [
											{
												type: "string",
												enum: ["Cop", "Mod"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["verbType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"1",
																			"2",
																			"3",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"1",
																		"2",
																		"3",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											polarity: {
												anyOf: [
													{
														type: "string",
														enum: ["Neg", "Pos"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Fut", "Past"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: ["Inf", "Part"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"gender",
											"number",
											"person",
											"polarity",
											"tense",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: ["Art", "Int"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["pronType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: ["Fem", "Masc"],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Fem",
																"Masc",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cons",
															"Def",
															"Ind",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Dual",
																	"Plur",
																	"Sing",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Dual",
																			"Plur",
																			"Sing",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Dual",
																		"Plur",
																		"Sing",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["definite", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Dual",
																	"Plur",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Dual",
																			"Plur",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Dual",
																		"Plur",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									definite: {
										anyOf: [
											{ type: "string", enum: ["Def"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Prs",
												],
											},
											{ type: "null" },
										],
									},
									reflex: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["definite", "pronType", "reflex"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"gender",
											"number",
											"person",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: ["Fem", "Masc"],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Fem",
																"Masc",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									case: {
										anyOf: [
											{ type: "string", enum: ["Tem"] },
											{ type: "null" },
										],
									},
								},
								required: ["case"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hebBinyan: {
										anyOf: [
											{
												type: "string",
												enum: [
													"HIFIL",
													"HITPAEL",
													"HUFAL",
													"NIFAL",
													"PAAL",
													"PIEL",
													"PUAL",
												],
											},
											{ type: "null" },
										],
									},
									hebExistential: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["hebBinyan", "hebExistential"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											mood: {
												anyOf: [
													{
														type: "string",
														enum: ["Imp"],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"1",
																			"2",
																			"3",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"1",
																		"2",
																		"3",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											polarity: {
												anyOf: [
													{
														type: "string",
														enum: ["Neg", "Pos"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Fut", "Past"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: ["Inf", "Part"],
													},
													{ type: "null" },
												],
											},
											voice: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Act",
															"Mid",
															"Pass",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"mood",
											"number",
											"person",
											"polarity",
											"tense",
											"verbForm",
											"voice",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Clitic": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/ToneMarking": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: { type: "string", enum: ["Standard", "Typo"] },
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"target/de": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Resolved" },
					target: {
						anyOf: [
							{
								type: "object",
								properties: {
									family: {
										type: "string",
										const: "Construction",
									},
									kind: { type: "string", const: "Fusion" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "ADJ" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "ADP" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "ADV" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "AUX" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "CCONJ" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "DET" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "INTJ" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "NOUN" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "NUM" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "PART" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "PRON" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "PROPN" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "SCONJ" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "SYM" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: { type: "string", const: "Lexeme" },
									kind: { type: "string", const: "VERB" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: {
										type: "string",
										const: "Phraseme",
									},
									kind: { type: "string", const: "Aphorism" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: {
										type: "string",
										const: "Phraseme",
									},
									kind: {
										type: "string",
										const: "DiscourseFormula",
									},
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: {
										type: "string",
										const: "Phraseme",
									},
									kind: { type: "string", const: "Idiom" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
							{
								type: "object",
								properties: {
									family: {
										type: "string",
										const: "Phraseme",
									},
									kind: { type: "string", const: "Proverb" },
								},
								required: ["family", "kind"],
								additionalProperties: false,
							},
						],
					},
					additionalMemberIndices: {
						type: "array",
						items: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991,
						},
					},
				},
				required: ["decision", "target", "additionalMemberIndices"],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
					target: { type: "null" },
					additionalMemberIndices: { type: "null" },
				},
				required: ["decision", "target", "additionalMemberIndices"],
				additionalProperties: false,
			},
		],
	},
	"target/en": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				anyOf: [
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Construction" },
							kind: { type: "string", const: "Fusion" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADP" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADV" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "AUX" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "CCONJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "DET" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "INTJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "NOUN" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "NUM" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "X" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PART" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PRON" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PROPN" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PUNCT" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "SCONJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "SYM" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "VERB" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Circumfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Clitic" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Duplifix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Infix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Interfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Prefix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Root" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Suffix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Suffixoid" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "ToneMarking" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Transfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Aphorism" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "DiscourseFormula" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Idiom" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Proverb" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
				],
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"target/he": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				anyOf: [
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Construction" },
							kind: { type: "string", const: "Fusion" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADP" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "ADV" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "AUX" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "CCONJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "DET" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "INTJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "NOUN" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "NUM" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "X" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PART" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PRON" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PROPN" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "PUNCT" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "SCONJ" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "SYM" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Lexeme" },
							kind: { type: "string", const: "VERB" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Circumfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Clitic" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Duplifix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Infix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Interfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Prefix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Root" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Suffix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Suffixoid" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "ToneMarking" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Morpheme" },
							kind: { type: "string", const: "Transfix" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Aphorism" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "DiscourseFormula" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Idiom" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
					{
						type: "object",
						properties: {
							family: { type: "string", const: "Phraseme" },
							kind: { type: "string", const: "Proverb" },
							memberSegmentIndices: {
								type: "array",
								prefixItems: [
									{
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991,
									},
								],
								items: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991,
								},
							},
						},
						required: ["family", "kind", "memberSegmentIndices"],
						additionalProperties: false,
					},
				],
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
};
