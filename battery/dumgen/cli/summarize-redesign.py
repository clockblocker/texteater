"""Read immutable evaluation records; produce comparison evidence without inference."""
import collections
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'evidence/typesafe-redesign'
records = []
for path in sorted((root / 'runs').glob('*/cases.jsonl')):
    manifest = json.loads((path.parent / 'manifest.json').read_text())
    for line in path.read_text().splitlines():
        records.append({**json.loads(line), 'runId': manifest['runId'], 'sourceRevision': manifest['sourceRevision'], 'startedAt': manifest['startedAt']})
records.sort(key=lambda record: record['startedAt'])
latest = {record['caseId']: record for record in records}
expected_ids = set()
for name in ['live-manifest.json', 'live-repair-manifest.json', 'live-comparison-manifest.json']:
    expected_ids.update(entry['id'] for entry in json.loads((root / name).read_text())['entries'])
assert set(latest) == expected_ids
assert len(records) == 128 and len(latest) == 127
calls = [call for record in records for trace in record['traces'] for call in trace['calls']]

def metrics(items):
    result = {'calls': len(items), 'latencyMs': sum(item['durationMs'] for item in items), 'transport': dict(collections.Counter(item['transport'] for item in items)), 'validation': dict(collections.Counter(item['validation'] for item in items))}
    for key in ['input_tokens', 'output_tokens']:
        values = [(item.get('output', {}) if item['executor'] == 'TypeSafe' else item.get('metadata', {})).get('usage', {}).get(key) for item in items]
        result[key] = sum(values) if all(isinstance(value, (int, float)) for value in values) else None
        result[key + '_missingCalls'] = sum(value is None for value in values)
    result['costUsd'] = None
    return result

by_stage = collections.defaultdict(list)
for call in calls:
    by_stage[f"{call['request']['stage']}/{call['executor']}"].append(call)
trace_issues = []
ignored_questions = 0
for record in records:
    for trace in record['traces']:
        seen = set()
        for call in trace['calls']:
            if not set(call['dependsOn']) <= seen: trace_issues.append(f"{record['caseId']}: dependency outside prior calls")
            seen.add(call['id'])
        for key in ['generationConfiguration', 'judgmentConfiguration']:
            if trace[key]['settings'].get('maxRetries') != 0: trace_issues.append(f"{record['caseId']}: retries not disabled")
        for event in trace['events']:
            if event['kind'] == 'JudgmentApplicability': ignored_questions += len(event['data'].get('ignored', []))
assert not trace_issues, trace_issues

comparisons = []
for record in latest.values():
    entry = record['input']
    differences = []
    if record['status'] != 'Success': category = 'domain-unavailable' if record['status'] in ['Unresolved', 'CatalogMiss'] else 'execution-failure'
    elif entry['role'] == 'held-out': category = 'held-out-human-review'
    elif entry['kind'] == 'recognition':
        expected, actual = entry['expected'], record['output']
        lemma, features = actual['attestation']['surface']['lemma'], actual['attestation']['surface'].get('inflectionalFeatures') or {}
        observed = {'kind': actual['target']['kind'], 'memberSegmentIndices': actual['target']['memberSegmentIndices'], 'canonicalForm': lemma['canonicalForm'], 'form': features.get('verbForm'), 'finiteTense': features.get('tense'), 'perfect': features.get('perfect') == 'Yes', 'future': features.get('future') == 'Yes', 'passive': features.get('passive'), 'realizationCoverage': actual['attestation']['realizationCoverage']}
        differences = [{'field': key, 'expected': expected[key], 'actual': value} for key, value in observed.items() if expected.get(key) != value]
        category = 'accepted-construction-difference' if differences else 'accepted-construction-match'
    elif entry['kind'] == 'corpus':
        category = 'retained-reference-match' if record['output'] == entry['expected'] else 'retained-reference-difference'
    elif entry['kind'] == 'intake':
        expected, actual = entry['expected'], record['output']
        if 'expectedDecision' in expected:
            differences = [] if all(item['decision'] == expected['expectedDecision'] for item in actual) else [{'field': 'decision', 'expected': expected['expectedDecision'], 'actual': [item['decision'] for item in actual]}]
        else:
            texts = [''.join(segment['text'] for segment in item['sentence']['segments']) if item['decision'] == 'Accepted' else item['decision'] for item in actual]
            languages = [item.get('language') for item in actual]
            if texts != expected.get('expectedTexts', expected['sourceSentences']): differences.append({'field': 'texts', 'expected': expected.get('expectedTexts', expected['sourceSentences']), 'actual': texts})
            if languages != expected['expectedLanguages']: differences.append({'field': 'languages', 'expected': expected['expectedLanguages'], 'actual': languages})
        category = 'intake-difference' if differences else 'intake-match'
    else:
        expected = entry['expected']
        differences = [{'field': 'decision', 'expected': expected['expectedDecision'], 'actual': record['output']['decision']}] if expected['expectedDecision'] != record['output']['decision'] else []
        category = 'reading-decision-difference' if differences else 'reading-human-review'
    comparisons.append({'caseId': record['caseId'], 'runId': record['runId'], 'role': entry['role'], 'status': record['status'], 'category': category, 'differences': differences, 'error': record.get('error'), 'calls': record['calls'], 'durationMs': record['durationMs'], 'usage': record['usage']})

baseline = json.loads((root / 'retained-baseline-comparison.json').read_text())
paired = []
for old in baseline['selectedAttempts']:
    new = latest[old['caseId']]
    assert old['canonicalInput'] == new['input']['input']
    assert old['canonicalIdealOutput']['target'] == new['idealOutput']
    paired.append({'caseId': old['caseId'], 'baselineAttempt': old['key'], 'baselineCheckpointSha256': baseline['source']['sha256'], 'baseline': {'model': old['resolvedModel'], 'calls': 1, 'usage': old['usage'], 'latencyMs': old['latencyMs'], 'output': old['canonicalOutput']}, 'current': {'runId': new['runId'], 'calls': new['calls'], 'usage': new['usage'], 'latencyMs': new['durationMs'], 'output': new['output']}, 'limitation': 'Two unchanged non-verbal cases only; historical cache state and timing differ. Baseline cost is a retained upper bound; current cost is unavailable. No general accuracy or savings estimate.'})
summary = {'version': 1, 'records': len(records), 'uniqueCases': len(latest), 'latestStatuses': dict(collections.Counter(record['status'] for record in latest.values())), 'allAttemptStatuses': dict(collections.Counter(record['status'] for record in records)), 'comparisonCategories': dict(collections.Counter(item['category'] for item in comparisons)), 'calls': metrics(calls), 'byStage': {stage: metrics(items) for stage, items in by_stage.items()}, 'operationDurationMs': sum(record['durationMs'] for record in records), 'unusedSpeculativeQuestions': ignored_questions, 'traceIntegrityIssues': trace_issues, 'pairedBaseline': paired, 'cases': comparisons, 'limits': ['Execution Success is not linguistic correctness. The 8 held-out cases remain human-reviewed; they were not used for tuning.', 'The original runner compared incompatible IDS/reference representations directly. Use the explicit comparison projections in this derived report; immutable raw runs retain the original exactMatch field.', 'One original held-reading InvalidInput attempt made zero model calls; its projection was repaired under a separately published one-entry manifest. Both records are retained.', 'Provider-reported cost is unavailable and is represented as null. Unused speculative calls and failed attempts are included in usage.', 'Four structured Knowledge prototypes remain deferred. tf-demo relation publication remains under its existing human qualification gate.']}
(root / 'live-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: summary[key] for key in ['records','uniqueCases','latestStatuses','comparisonCategories','calls','unusedSpeculativeQuestions']}, ensure_ascii=False, indent=2))
