import { describe, it, expect } from 'vitest';
import { parseTestDbName, generateRunId, filterStaleTestDbs } from './clone-template';

describe('parseTestDbName', () => {
	it('parses a local test DB name', () => {
		expect(parseTestDbName('test_1745776800_w0')).toEqual({
			runId: '1745776800',
			workerIndex: 0
		});
	});

	it('returns null for non-test names', () => {
		expect(parseTestDbName('dev')).toBeNull();
		expect(parseTestDbName('test_template')).toBeNull();
		expect(parseTestDbName('postgres')).toBeNull();
	});

	it('parses a CI run-id name', () => {
		const parsed = parseTestDbName('test_8123456789_w2');
		expect(parsed).not.toBeNull();
		expect(parsed!.runId).toBe('8123456789');
		expect(parsed!.workerIndex).toBe(2);
	});

	it('parses a CI re-run name (with attempt suffix)', () => {
		const parsed = parseTestDbName('test_8123456789a3_w0');
		expect(parsed).not.toBeNull();
		expect(parsed!.runId).toBe('8123456789a3');
		expect(parsed!.workerIndex).toBe(0);
	});
});

describe('generateRunId', () => {
	it('uses GITHUB_RUN_ID when set, no attempt', () => {
		expect(generateRunId({ GITHUB_RUN_ID: '8123456789' })).toBe('8123456789');
	});

	it('appends attempt when GITHUB_RUN_ATTEMPT > 1', () => {
		expect(generateRunId({ GITHUB_RUN_ID: '8123456789', GITHUB_RUN_ATTEMPT: '3' })).toBe(
			'8123456789a3'
		);
	});

	it('omits attempt suffix when GITHUB_RUN_ATTEMPT is 1', () => {
		expect(generateRunId({ GITHUB_RUN_ID: '8123456789', GITHUB_RUN_ATTEMPT: '1' })).toBe(
			'8123456789'
		);
	});

	it('falls back to unix seconds locally', () => {
		const id = generateRunId({}, () => 1745776800123);
		expect(id).toBe('1745776800');
	});
});

describe('filterStaleTestDbs', () => {
	const now = 1745780000;
	const thresholdSeconds = 3600;

	it('keeps fresh DBs', () => {
		const fresh = `test_${now - 100}_w0`;
		expect(filterStaleTestDbs([fresh], now, thresholdSeconds)).toEqual([]);
	});

	it('returns DBs older than the threshold', () => {
		const stale = `test_${now - 7200}_w0`;
		const fresh = `test_${now - 100}_w0`;
		expect(filterStaleTestDbs([stale, fresh], now, thresholdSeconds)).toEqual([stale]);
	});

	it('ignores non-test names entirely', () => {
		expect(filterStaleTestDbs(['dev', 'test_template', 'postgres'], now, thresholdSeconds)).toEqual(
			[]
		);
	});

	it('keeps CI DBs (non-numeric runId) since age is unknown', () => {
		const ciDb = 'test_8123456789_w0';
		expect(filterStaleTestDbs([ciDb], now, thresholdSeconds)).toEqual([]);
	});
});
