/**
 * 20-Test Automated Failure-Injection & Reliability Test Suite
 * Validates fault-tolerant state machine, failure classifier, circuit breaker,
 * checkpoint dual-persistence, pause/resume coordination, and idempotent reconciler.
 */

import { setupMockBrowser } from './mock_browser_env.mjs';

// Setup environment before importing extension modules
const env = setupMockBrowser();

import { JOB_STATES, DurableStateMachine } from '../10SecNewExtension/utils/state-machine.js';
import { FailureClassifier, ERROR_CATEGORIES } from '../10SecNewExtension/utils/failure-classifier.js';
import { circuitBreaker, CIRCUIT_STATES } from '../10SecNewExtension/utils/circuit-breaker.js';
import { CheckpointManager } from '../10SecNewExtension/utils/checkpoint-manager.js';
import { pauseManager, PAUSE_REASONS } from '../10SecNewExtension/utils/pause-manager.js';
import { Reconciler } from '../10SecNewExtension/content/reconciler.js';
import { DownloadRecoveryEngine } from '../10SecNewExtension/content/download-recovery.js';
import { recoverySupervisor } from '../10SecNewExtension/content/recovery-supervisor.js';
import { BatchController } from '../10SecNewExtension/content/batch-controller.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(testNum, testName, testFn) {
  totalTests++;
  console.log(`\n============================================================`);
  console.log(`🧪 RUNNING TEST ${String(testNum).padStart(2, '0')}: ${testName}`);
  console.log(`============================================================`);
  try {
    // Reset state before test
    circuitBreaker.reset();
    pauseManager.clearPause('test_reset');
    env.mockDoc.clear();
    await testFn();
    passedTests++;
    console.log(`✅ [PASS] TEST ${String(testNum).padStart(2, '0')}: ${testName}`);
  } catch (err) {
    console.error(`❌ [FAIL] TEST ${String(testNum).padStart(2, '0')}: ${testName}`);
    console.error(`   Error: ${err.message}`);
    console.error(err.stack);
  }
}

async function main() {
  console.log(`🚀 Starting FlowCraft Extension Reliability & Fault-Tolerance Test Suite`);
  await recoverySupervisor.init();

  // TEST 01: Network disconnect during submit
  await runTest(1, 'Network disconnect during submit', async () => {
    const error = new Error('net::ERR_INTERNET_DISCONNECTED: Failed to fetch');
    const classification = FailureClassifier.classify(error);
    assert(classification.category === ERROR_CATEGORIES.NETWORK, 'Must classify as NETWORK');
    assert(classification.policy.pauseReason === PAUSE_REASONS.PAUSE_NETWORK, 'Must pause with PAUSE_NETWORK');

    // Simulate supervisor handling failure
    const jobCp = CheckpointManager.createCheckpoint({ job_id: 'job_test_01', state: JOB_STATES.SUBMITTING });
    recoverySupervisor.activeCheckpoint = jobCp;
    await recoverySupervisor.handleFailure(error);

    assert(pauseManager.isPaused(), 'System must be paused');
    assert(pauseManager.getPauseInfo().reason === PAUSE_REASONS.PAUSE_NETWORK, 'Pause reason must be PAUSE_NETWORK');
    assert(jobCp.state === JOB_STATES.NETWORK_ERROR || jobCp.state === JOB_STATES.RETRY_WAIT || jobCp.state === JOB_STATES.PAUSED, 'State must transition to retry/paused/network_error');

    // Simulate network reconnection
    env.mockWindow.simulateOnline();
    assert(!pauseManager.isPaused(), 'System must resume automatically when back online');
  });

  // TEST 02: Network disconnect during generation
  await runTest(2, 'Network disconnect during generation polling', async () => {
    const jobCp = CheckpointManager.createCheckpoint({ job_id: 'job_test_02', state: JOB_STATES.GENERATING, tile_id: 'tile_99' });
    recoverySupervisor.activeCheckpoint = jobCp;

    // Network drops while monitoring tile
    const netErr = new Error('FetchError: network socket disconnected before response');
    const classification = FailureClassifier.classify(netErr);
    assert(classification.category === ERROR_CATEGORIES.NETWORK, 'Must classify as NETWORK');

    await recoverySupervisor.handleFailure(netErr);
    assert(pauseManager.isPaused(), 'Must pause polling without re-submitting prompt');
    assert(jobCp.tile_id === 'tile_99', 'Existing tile_id must be preserved across network drop');
  });

  // TEST 03: Network disconnect during download
  await runTest(3, 'Network disconnect during download stream', async () => {
    const jobCp = CheckpointManager.createCheckpoint({
      job_id: 'job_test_03',
      state: JOB_STATES.DOWNLOADING,
      tile_id: 'tile_dl_1'
    });

    // Verify state transition from DOWNLOADING to DOWNLOAD_FAILED is valid
    assert(DurableStateMachine.canTransition(JOB_STATES.DOWNLOADING, JOB_STATES.DOWNLOAD_FAILED), 'DOWNLOADING -> DOWNLOAD_FAILED must be valid');
    assert(DurableStateMachine.canTransition(JOB_STATES.DOWNLOAD_FAILED, JOB_STATES.DOWNLOADING), 'DOWNLOAD_FAILED -> DOWNLOADING retry must be valid');

    // Classification test
    const dlErr = new Error('MediaStream connection aborted: download failed');
    const classification = FailureClassifier.classify(dlErr);
    assert(classification.category === ERROR_CATEGORIES.DOWNLOAD, 'Must classify as DOWNLOAD error');
    assert(classification.policy.retryable === true, 'Download error must be retryable without re-generation');
  });

  // TEST 04: HTTP 429 Too Many Requests
  await runTest(4, 'HTTP 429 Rate Limit error handling', async () => {
    const error = { status: 429, statusText: 'Too Many Requests', message: 'Quota exceeded / rate limited' };
    const classification = FailureClassifier.classify(error);
    assert(classification.category === ERROR_CATEGORIES.RATE_LIMIT, 'Must classify as RATE_LIMIT');
    assert(classification.policy.pauseReason === PAUSE_REASONS.PAUSE_RATE_LIMITED, 'Must pause with PAUSE_RATE_LIMITED');
    assert(classification.policy.baseDelayMs >= 60000, 'Must enforce at least 60s cooldown for 429');

    const jobCp = CheckpointManager.createCheckpoint({ job_id: 'job_test_04', state: JOB_STATES.SUBMITTING });
    recoverySupervisor.activeCheckpoint = jobCp;
    await recoverySupervisor.handleFailure(error);

    assert(pauseManager.isPaused(), 'System must be paused on 429');
    const resumeCheck = pauseManager.canResume();
    assert(resumeCheck.allowed === false, 'Cannot resume before cooldown expires');
    assert(resumeCheck.waitSec > 0, 'Remaining cooldown seconds must be positive');
  });

  // TEST 05: HTTP 500 Internal Server Error
  await runTest(5, 'HTTP 500 / 503 Server Error handling', async () => {
    const error500 = { status: 500, statusText: 'Internal Server Error', message: 'Flow backend exception' };
    const classification = FailureClassifier.classify(error500);
    assert(classification.category === ERROR_CATEGORIES.NETWORK, 'HTTP 500 classifies as temporary server/network error');
    assert(classification.policy.retryable === true, 'Must be retryable');
    assert(classification.policy.maxRetries <= 5 && classification.policy.maxRetries >= 3, 'Must have bounded retries');

    const delay1 = FailureClassifier.calculateDelay(classification.policy, 1);
    const delay2 = FailureClassifier.calculateDelay(classification.policy, 2);
    assert(delay2 >= delay1, 'Must enforce exponential backoff');
  });

  // TEST 06: Protection / unusual-activity signal
  await runTest(6, 'Protection / unusual activity signal handling & Circuit Breaker', async () => {
    const error = new Error('Unusual activity warning detected on Google Flow canvas');
    const classification = FailureClassifier.classify(error);
    assert(classification.category === ERROR_CATEGORIES.PROTECTION, 'Must classify as PROTECTION');

    // Handle failure and ensure circuit breaker trips
    const jobCp = CheckpointManager.createCheckpoint({ job_id: 'job_test_06', state: JOB_STATES.SUBMITTING });
    recoverySupervisor.activeCheckpoint = jobCp;
    await recoverySupervisor.handleFailure(error);

    assert(circuitBreaker.getState() === CIRCUIT_STATES.OPEN, 'Circuit Breaker must TRIP to OPEN');
    assert(circuitBreaker.canExecute().allowed === false, 'Execution must be forbidden while Circuit Breaker is OPEN');
    assert(pauseManager.isPaused(), 'Pause Manager must be active');
    assert(pauseManager.getPauseInfo().reason === PAUSE_REASONS.PAUSE_PROTECTION, 'Pause reason must be PAUSE_PROTECTION');
  });

  // TEST 07: Tab crash / close during job
  await runTest(7, 'Tab crash recovery via dual-persistence checkpoint', async () => {
    const testJobId = 'job_tab_crash_07';
    await CheckpointManager.saveCheckpoint({
      job_id: testJobId,
      prompt: 'A cinematic video of cosmic nebulae',
      state: JOB_STATES.SUBMITTED,
      tile_id: 'tile_restored_1',
      attempt: 1
    });

    // Simulate tab dying: memory wiped, reload from storage
    const recovered = await CheckpointManager.getActiveJobCheckpoint();
    assert(recovered !== null, 'Must recover checkpoint after simulated tab crash');
    assert(recovered.job_id === testJobId, 'Recovered job ID must match');
    assert(recovered.state === JOB_STATES.SUBMITTED, 'State must match SUBMITTED');
    assert(recovered.tile_id === 'tile_restored_1', 'Tile ID must survive tab crash');
  });

  // TEST 08: Service worker restart / reload
  await runTest(8, 'Service worker restart resilience', async () => {
    const batchData = {
      id: 'batch_sw_restart_08',
      payloads: [
        { job_id: 'sw_job_1', prompt: 'Scene 1' },
        { job_id: 'sw_job_2', prompt: 'Scene 2' }
      ],
      completedJobIds: ['sw_job_1'],
      currentJobIndex: 1,
      status: 'paused'
    };

    const controller = new BatchController(batchData);
    await controller.persistBatchState();

    // Reconstruct controller as if service worker restarted
    const reloaded = await BatchController.loadActiveBatch();
    assert(reloaded !== null, 'Batch controller must reload state from storage');
    assert(reloaded.id === batchData.id, 'Batch ID must match');
    assert(reloaded.completedJobIds.has('sw_job_1'), 'Completed jobs must be preserved');
    assert(reloaded.currentJobIndex === 1, 'Current job index must be preserved');
  });

  // TEST 09: Content script restart / reload
  await runTest(9, 'Content script refresh mid-pipeline & UI reconciliation', async () => {
    // Add tile that was already completed during previous session
    env.mockDoc.addMockTile('tile_mid_refresh', 'completed');

    const checkpoint = {
      job_id: 'job_refresh_09',
      tile_id: 'tile_mid_refresh',
      prompt: 'A majestic golden eagle in flight',
      state: JOB_STATES.GENERATING
    };

    const verdict = await Reconciler.reconcile(checkpoint, checkpoint);
    assert(verdict.action === 'SKIP_TO_DOWNLOAD', 'Must identify tile as completed and skip to download');
    assert(verdict.tileId === 'tile_mid_refresh', 'Must attach to existing tile ID');
  });

  // TEST 10: Python Bridge restart
  await runTest(10, 'Python Bridge restart resilience & fallback to local storage', async () => {
    // Save checkpoint when bridge is offline (only local storage available)
    const cp = await CheckpointManager.saveCheckpoint({
      job_id: 'job_bridge_restart_10',
      prompt: 'Testing bridge offline fallback',
      state: JOB_STATES.GENERATED,
      tile_id: 'tile_bridge_1'
    });

    assert(cp !== null, 'Checkpoint saving must succeed even if bridge is unavailable');
    const loaded = await CheckpointManager.loadCheckpoint('job_bridge_restart_10');
    assert(loaded !== null, 'Checkpoint must load from local storage fallback');
    assert(loaded.state === JOB_STATES.GENERATED, 'State must match GENERATED');
  });

  // TEST 11: Full browser reload / restart
  await runTest(11, 'Full browser reload and startup self-healing', async () => {
    await CheckpointManager.saveCheckpoint({
      job_id: 'job_full_restart_11',
      prompt: 'Deep space exploration probe',
      state: JOB_STATES.SUBMITTED,
      tile_id: 'tile_full_11'
    });

    // Add actively rendering tile to DOM
    env.mockDoc.addMockTile('tile_full_11', 'rendering');

    const healingResult = await recoverySupervisor.runStartupSelfHealing();
    assert(healingResult.status === 'reconciled', 'Self-healing must reconcile UI state');
    assert(healingResult.verdict.action === 'ATTACH_GENERATION_MONITOR', 'Must attach generation monitor');
  });

  // TEST 12: Auth / session expired interruption
  await runTest(12, 'Auth / session expired interruption', async () => {
    const authErr = new Error('Google Account sign in required / session expired');
    const classification = FailureClassifier.classify(authErr);
    assert(classification.category === ERROR_CATEGORIES.AUTH, 'Must classify as AUTH');
    assert(classification.policy.requiresManualIntervention === true, 'Must require manual user intervention');

    const jobCp = CheckpointManager.createCheckpoint({ job_id: 'job_test_12', state: JOB_STATES.SUBMITTING });
    recoverySupervisor.activeCheckpoint = jobCp;
    const res = await recoverySupervisor.handleFailure(authErr);

    assert(res.action === 'PAUSE_AUTH', 'Action must be PAUSE_AUTH');
    assert(pauseManager.isPaused(), 'System must pause on AUTH error');
    assert(pauseManager.getPauseInfo().requiresManualIntervention === true, 'Pause metadata must flag manual intervention');
  });

  // TEST 13: Generation timeout
  await runTest(13, 'Generation timeout classification & bounded retry policy', async () => {
    const timeoutErr = new Error('Tile generation polling timed out after 300000ms');
    const classification = FailureClassifier.classify(timeoutErr);
    assert(classification.category === ERROR_CATEGORIES.TIMEOUT, 'Must classify as TIMEOUT');
    assert(classification.policy.maxRetries === 2, 'Generation timeout max retries must be bounded (2)');
    assert(classification.policy.targetState === JOB_STATES.GENERATION_TIMEOUT, 'Target state must be GENERATION_TIMEOUT');
  });

  // TEST 14: Download interruption / corrupted file
  await runTest(14, 'Download interruption recovery without re-generating', async () => {
    const tile = env.mockDoc.addMockTile('tile_dl_14', 'completed');
    const item = {
      job_id: 'job_test_14',
      promptIndex: 1,
      prompt: 'A futuristic floating city',
      folderName: 'FlowCraft_Outputs'
    };

    const cp = CheckpointManager.createCheckpoint({
      job_id: 'job_test_14',
      tile_id: 'tile_dl_14',
      state: JOB_STATES.GENERATED
    });

    const result = await DownloadRecoveryEngine.recoverAndDownload(tile, item, cp);
    assert(result.success === true, 'Download recovery must succeed using Layer 1 video stream capture');
    assert(result.videoUrl.includes('tile_dl_14.mp4'), 'Extracted videoUrl must match stream source');
    assert(cp.state === JOB_STATES.VERIFYING, 'Checkpoint must update to VERIFYING');
  });

  // TEST 15: Duplicate resume attempt
  await runTest(15, 'Duplicate resume attempt idempotency', async () => {
    // Pause system
    pauseManager.requestPause(PAUSE_REASONS.PAUSE_MANUAL, 'job_15', JOB_STATES.PAUSED);
    assert(pauseManager.isPaused() === true, 'Must be paused');

    // First resume
    const res1 = pauseManager.clearPause('test_resume');
    assert(res1.cleared === true, 'First resume must clear pause');
    assert(pauseManager.isPaused() === false, 'Must be unpaused');

    // Second resume (duplicate)
    const res2 = pauseManager.clearPause('test_resume');
    assert(res2.cleared === false, 'Duplicate resume must be a clean no-op');
    assert(pauseManager.isPaused() === false, 'Must remain unpaused');
  });

  // TEST 16: Batch generation partial failure on Job N
  await runTest(16, 'Batch generation partial failure on Job N with queue isolation', async () => {
    const batch = new BatchController({
      id: 'batch_test_16',
      payloads: [
        { job_id: 'batch_j1', prompt: 'Job 1' },
        { job_id: 'batch_j2', prompt: 'Job 2' },
        { job_id: 'batch_j3', prompt: 'Job 3' }
      ]
    });

    // Mark Job 1 complete
    batch.completedJobIds.add('batch_j1');
    batch.currentJobIndex = 1; // At Job 2
    await batch.persistBatchState();

    // Checkpoint Job 2 paused
    await CheckpointManager.saveCheckpoint({
      job_id: 'batch_j2',
      state: JOB_STATES.PAUSED,
      last_verified_action: 'Job 2 failed gracefully'
    });

    // Verify Job 1 stays completed, Job 3 is intact in queue
    const saved = await BatchController.loadActiveBatch();
    assert(saved.completedJobIds.has('batch_j1'), 'Job 1 must remain completed');
    assert(!saved.completedJobIds.has('batch_j2'), 'Job 2 must not be marked complete');
    assert(saved.payloads.length === 3, 'Full payload queue must remain intact');
  });

  // TEST 17: Consecutive failures & Circuit Breaker trip
  await runTest(17, 'Consecutive protection failures trip Circuit Breaker to OPEN', async () => {
    circuitBreaker.reset();
    assert(circuitBreaker.getState() === CIRCUIT_STATES.CLOSED, 'Circuit must start CLOSED');

    // Record failure 1
    circuitBreaker.recordFailure('PROTECTION', 'Warning banner 1');
    assert(circuitBreaker.getState() === CIRCUIT_STATES.OPEN, 'Protection error immediately trips breaker');
    assert(circuitBreaker.getConsecutiveFailures() === 1, 'Consecutive failures must be 1');

    // Probe while OPEN
    const check = circuitBreaker.canExecute();
    assert(check.allowed === false, 'Requests must be blocked while OPEN');
  });

  // TEST 18: Prolonged pause recovery
  await runTest(18, 'Prolonged pause state integrity and seamless resume', async () => {
    const longPausedCp = {
      job_id: 'job_prolonged_18',
      prompt: 'A solar flare erupting from a red dwarf star',
      state: JOB_STATES.PAUSED,
      timestamp: Date.now() - (3600 * 1000 * 4), // 4 hours ago
      tile_id: 'tile_18'
    };
    await CheckpointManager.saveCheckpoint(longPausedCp);

    const loaded = await CheckpointManager.loadCheckpoint('job_prolonged_18');
    assert(loaded !== null, 'Checkpoint must survive hours of pause');
    assert(loaded.state === JOB_STATES.PAUSED, 'State must remain PAUSED');

    // Ensure pause can be cleared safely
    pauseManager.requestPause(PAUSE_REASONS.PAUSE_PROTECTION, 'job_prolonged_18', JOB_STATES.PAUSED, { cooldownMs: 10 });
    await new Promise(r => setTimeout(r, 20));
    const canRes = pauseManager.canResume();
    assert(canRes.allowed === true, 'Must allow resume after cooldown expires');
  });

  // TEST 19: Already-generated job reconciliation
  await runTest(19, 'Already-generated job reconciliation prevents duplicate submission', async () => {
    // Canvas already has completed tile
    env.mockDoc.addMockTile('tile_already_done_19', 'completed');

    const item = {
      job_id: 'job_dup_19',
      tile_id: 'tile_already_done_19',
      prompt: 'A hyper-realistic mechanical clock tower',
      mode: 'textToVideo'
    };

    const verdict = await Reconciler.reconcile(item, item);
    assert(verdict.action === 'SKIP_TO_DOWNLOAD', 'Must skip submit and jump to download');
    assert(verdict.tileId === 'tile_already_done_19', 'Must pinpoint matching tile');
  });

  // TEST 20: Database / UI state mismatch reconciliation
  await runTest(20, 'Database/UI state mismatch reconciliation', async () => {
    // DB checkpoint says "SUBMITTED", but UI has already finished rendering!
    const cp = {
      job_id: 'job_mismatch_20',
      prompt: 'A glowing bio-luminescent forest at night',
      state: JOB_STATES.SUBMITTED,
      tile_id: 'tile_forest_20'
    };

    env.mockDoc.addMockTile('tile_forest_20', 'completed');

    const verdict = await Reconciler.reconcile(cp, cp);
    assert(verdict.action === 'SKIP_TO_DOWNLOAD', 'Reconciler must detect completed tile despite DB saying SUBMITTED');

    // Update checkpoint based on reconciliation verdict
    cp.state = JOB_STATES.GENERATED;
    cp.last_verified_action = 'Reconciler reconciled state from UI';
    const updated = await CheckpointManager.saveCheckpoint(cp);
    assert(updated.state === JOB_STATES.GENERATED, 'Checkpoint state successfully synced to GENERATED');
  });

  console.log(`\n============================================================`);
  console.log(`📊 FINAL TEST REPORT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`============================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
