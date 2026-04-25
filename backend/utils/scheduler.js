/**
 * Weekly Kerala Temple Event Scheduler
 *
 * Automatically fetches and inserts new upcoming Kerala temple events
 * into the database every 7 days. Uses Node's native setInterval
 * (no extra dependencies required).
 *
 * Flow:
 *   1. Initial run: 15 seconds after server starts (lets DB stabilise)
 *   2. Repeat:      Every 7 days thereafter
 *
 * All inserted events have:
 *   status:  'pending'  → must be admin-approved before going public
 *   addedBy: 'AI'       → tagged for easy identification and queue filtering
 */

'use strict';

const { fetchAndInsertNewEvents } = require('./aiEventFetcher');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 ms

let _schedulerInterval = null;
let _isRunning        = false;   // guard against concurrent runs

// ─── Core job ────────────────────────────────────────────────────────────────

async function runScheduledFetch(triggeredBy = 'scheduler') {
  if (_isRunning) {
    console.warn('[AI Scheduler] Previous run still in progress — skipping this cycle.');
    return 0;
  }
  _isRunning = true;
  console.log(`[AI Scheduler] 🤖 Running Kerala temple event fetch (source: ${triggeredBy}) — ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);

  try {
    const count = await fetchAndInsertNewEvents();
    if (count > 0) {
      console.log(`[AI Scheduler] ✅ ${count} new event(s) queued for admin review.`);
    } else {
      console.log('[AI Scheduler] ℹ️  No new events this cycle (all already in database or none upcoming).');
    }
    return count;
  } catch (err) {
    console.error('[AI Scheduler] ❌ Run failed:', err.message);
    return 0;
  } finally {
    _isRunning = false;
  }
}

// ─── Scheduler Lifecycle ──────────────────────────────────────────────────────

function startScheduler() {
  if (_schedulerInterval) {
    console.warn('[AI Scheduler] Already running — startScheduler() called twice.');
    return;
  }

  console.log('[AI Scheduler] 🕐 Kerala temple event scheduler initialised.');
  console.log('[AI Scheduler]    First run in 15 seconds | Repeats every 7 days.');

  // Initial run (short delay so MongoDB connection is fully ready)
  setTimeout(() => runScheduledFetch('startup'), 15_000);

  // Repeat every 7 days
  _schedulerInterval = setInterval(() => runScheduledFetch('weekly-cron'), SEVEN_DAYS_MS);

  // Allow Node.js to exit cleanly even if the interval is pending
  if (_schedulerInterval.unref) _schedulerInterval.unref();
}

function stopScheduler() {
  if (_schedulerInterval) {
    clearInterval(_schedulerInterval);
    _schedulerInterval = null;
    console.log('[AI Scheduler] Stopped.');
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = { startScheduler, stopScheduler, runScheduledFetch };
