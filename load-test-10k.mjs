/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   IMAN BOOKING — 10,000 USER CONCURRENCY STORM TEST  ║
 * ║   Simulates tonight's real-world scenario             ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node load-test-10k.mjs [--users 10000] [--target http://localhost:3000]
 *                          [--waves 10] [--slots 3] [--cleanup]
 *
 * Modes:
 *   --target http://localhost:3000   → hits your local Next.js API  (default)
 *   --target https://your-site.com  → hits live Supabase via your server
 */

import { performance } from 'perf_hooks'

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : def
}
const hasFlag = (flag) => args.includes(flag)

const TARGET      = getArg('--target',  'http://localhost:3000')
const TOTAL_USERS = parseInt(getArg('--users',   '10000'))
const WAVE_COUNT  = parseInt(getArg('--waves',   '10'))         // send in N waves
const SLOT_COUNT  = parseInt(getArg('--slots',   '3'))          // attack N slots
const DO_CLEANUP  = hasFlag('--cleanup')
const EVENT_DATE  = '2026-06-06'
const MAX_PER_SLOT = 30

// Slots to attack simultaneously (simulates everyone fighting for the best times)
const TARGET_SLOTS = ['13:00', '13:20', '13:40', '14:00', '14:20', '14:40'].slice(0, SLOT_COUNT)

// ─── COLOUR HELPERS ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  magenta:'\x1b[35m',
}
const clr = (color, str) => `${c[color]}${str}${c.reset}`

// ─── BANNER ───────────────────────────────────────────────────────────────────
console.log('')
console.log(clr('cyan', '╔══════════════════════════════════════════════════════╗'))
console.log(clr('cyan', '║') + clr('bold', '   IMAN BOOKING — 10K USER STORM TEST              ') + clr('cyan', '║'))
console.log(clr('cyan', '╠══════════════════════════════════════════════════════╣'))
console.log(clr('cyan', '║') + `   🎯 Target:    ${TARGET.padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '║') + `   👥 Users:     ${String(TOTAL_USERS).padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '║') + `   🌊 Waves:     ${String(WAVE_COUNT).padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '║') + `   🕐 Slots:     ${TARGET_SLOTS.join(', ').padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '║') + `   🗓️  Date:      ${EVENT_DATE.padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '║') + `   🪣 Max/slot:  ${String(MAX_PER_SLOT).padEnd(37)}` + clr('cyan', '║'))
console.log(clr('cyan', '╚══════════════════════════════════════════════════════╝'))
console.log('')

// ─── SINGLE BOOKING REQUEST ───────────────────────────────────────────────────
async function bookUser(userId, slotTime) {
  const t0 = performance.now()
  try {
    const res = await fetch(`${TARGET}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_time:   slotTime,
        event_date:  EVENT_DATE,
        nama:        `LoadTest User ${userId}`,
        email:       `loadtest_${userId}@stresstest.invalid`,
        no_telefon:  `011${String(userId).padStart(8, '0')}`,
        umur:        25,
        daerah:      'Test Daerah',
        negeri:      'Selangor',
        bilangan:    1,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout per request
    })

    const latencyMs = Math.round(performance.now() - t0)
    const data = await res.json()

    return {
      userId,
      slotTime,
      status:    res.status,
      ok:        data.success === true,
      error:     data.error || null,
      ref:       data.booking_ref || null,
      latencyMs,
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - t0)
    return {
      userId,
      slotTime,
      status:    0,
      ok:        false,
      error:     err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      ref:       null,
      latencyMs,
    }
  }
}

// ─── CLEANUP ──────────────────────────────────────────────────────────────────
async function cleanup(refs) {
  if (!refs.length) return
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.log(clr('yellow', '⚠️  Cannot clean up — no Supabase credentials in env.'))
    return
  }
  console.log(clr('gray', `\n🧹 Cleaning up ${refs.length} test bookings...`))
  let deleted = 0
  for (const ref of refs) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/bookings?booking_ref=eq.${ref}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      })
      deleted++
    } catch { /* ignore */ }
  }
  console.log(clr('gray', `   ✓ Deleted ${deleted}/${refs.length} test bookings.`))
}

// ─── STATS HELPER ─────────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const i = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, i)]
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function run() {
  // Sanity check: is the server reachable?
  console.log(clr('gray', `🔍 Checking if server is reachable at ${TARGET}...`))
  try {
    const ping = await fetch(`${TARGET}/api/slots?date=${EVENT_DATE}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!ping.ok && ping.status !== 400) {
      console.log(clr('yellow', `⚠️  Server responded with HTTP ${ping.status}. Continuing anyway...`))
    } else {
      console.log(clr('green', `✅ Server is up! (HTTP ${ping.status})\n`))
    }
  } catch (err) {
    console.error(clr('red', `\n❌ Cannot reach ${TARGET}`))
    console.error(clr('red', `   Error: ${err.message}`))
    console.error(clr('yellow', `\n   👉 Make sure your dev server is running: npm run dev`))
    console.error(clr('yellow', `   👉 Or pass a live URL: node load-test-10k.mjs --target https://your-site.com\n`))
    process.exit(1)
  }

  const usersPerWave = Math.ceil(TOTAL_USERS / WAVE_COUNT)
  const allResults   = []
  const globalStart  = performance.now()

  console.log(clr('bold', `\n🚀 Launching ${TOTAL_USERS.toLocaleString()} users in ${WAVE_COUNT} waves of ~${usersPerWave.toLocaleString()} each...\n`))

  for (let wave = 0; wave < WAVE_COUNT; wave++) {
    const waveStart  = wave * usersPerWave + 1
    const waveEnd    = Math.min(waveStart + usersPerWave - 1, TOTAL_USERS)
    const waveSize   = waveEnd - waveStart + 1

    const t0 = performance.now()
    process.stdout.write(clr('gray', `  Wave ${String(wave + 1).padStart(2)}/${WAVE_COUNT} — ${waveSize.toLocaleString()} users... `))

    // Each user in the wave picks a random slot from the targets
    const batch = Array.from({ length: waveSize }, (_, i) => {
      const userId   = waveStart + i
      const slotTime = TARGET_SLOTS[userId % TARGET_SLOTS.length]
      return bookUser(userId, slotTime)
    })

    const waveResults = await Promise.allSettled(batch)
    const elapsed     = Math.round(performance.now() - t0)

    const settled = waveResults.map(r => r.status === 'fulfilled' ? r.value : {
      ok: false, error: 'PROMISE_REJECTED', latencyMs: 0, ref: null
    })

    const ok  = settled.filter(r => r.ok).length
    const err = settled.filter(r => !r.ok).length
    console.log(clr('green', `✅ ${ok} ok`) + clr('gray', ' | ') + clr('red', `❌ ${err} err`) + clr('gray', ` | ${elapsed}ms`))

    allResults.push(...settled)

    // Brief breathing room between waves (prevents socket exhaustion)
    if (wave < WAVE_COUNT - 1) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  const totalElapsed = Math.round(performance.now() - globalStart)

  // ─── AGGREGATE RESULTS ────────────────────────────────────────────────────
  const accepted      = allResults.filter(r => r.ok)
  const rejected      = allResults.filter(r => !r.ok)
  const slotFull      = rejected.filter(r => r.error === 'SLOT_FULL')
  const alreadyBooked = rejected.filter(r => r.error === 'ALREADY_BOOKED')
  const timeouts      = rejected.filter(r => r.error === 'TIMEOUT')
  const networkErrs   = rejected.filter(r => r.error === 'NETWORK_ERROR')
  const serverErrs    = rejected.filter(r => ['DB_ERROR', 'INTERNAL_ERROR'].includes(r.error))
  const otherErrs     = rejected.filter(r =>
    !['SLOT_FULL', 'ALREADY_BOOKED', 'TIMEOUT', 'NETWORK_ERROR', 'DB_ERROR', 'INTERNAL_ERROR'].includes(r.error)
  )

  const latencies     = allResults.map(r => r.latencyMs).filter(l => l > 0)
  const avgLatency    = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0
  const p50           = percentile(latencies, 50)
  const p95           = percentile(latencies, 95)
  const p99           = percentile(latencies, 99)
  const maxLatency    = latencies.length ? Math.max(...latencies) : 0
  const rps           = Math.round((allResults.length / totalElapsed) * 1000)

  // Per-slot breakdown
  const slotStats = {}
  for (const slot of TARGET_SLOTS) {
    const slotResults = allResults.filter(r => r.slotTime === slot)
    slotStats[slot] = {
      accepted: slotResults.filter(r => r.ok).length,
      total:    slotResults.length,
    }
  }

  const totalExpectedMax = TARGET_SLOTS.length * MAX_PER_SLOT
  const isOverbookingOccurred = accepted.length > totalExpectedMax

  // ─── PRINT REPORT ─────────────────────────────────────────────────────────
  console.log('')
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log(clr('bold', '                  📊 FULL TEST REPORT'))
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log('')
  console.log(clr('bold', '  📈 THROUGHPUT'))
  console.log(`     Total requests  : ${clr('bold', allResults.length.toLocaleString())}`)
  console.log(`     Total time       : ${clr('bold', `${(totalElapsed / 1000).toFixed(2)}s`)}`)
  console.log(`     Avg req/sec      : ${clr('bold', `${rps.toLocaleString()} RPS`)}`)
  console.log('')
  console.log(clr('bold', '  ⚡ LATENCY'))
  console.log(`     Average          : ${clr('yellow', `${avgLatency}ms`)}`)
  console.log(`     p50 (median)     : ${clr('yellow', `${p50}ms`)}`)
  console.log(`     p95              : ${p95 < 2000 ? clr('yellow', `${p95}ms`) : clr('red', `${p95}ms`)}`)
  console.log(`     p99              : ${p99 < 5000 ? clr('yellow', `${p99}ms`) : clr('red', `${p99}ms`)}`)
  console.log(`     Max              : ${maxLatency < 10000 ? clr('yellow', `${maxLatency}ms`) : clr('red', `${maxLatency}ms`)}`)
  console.log('')
  console.log(clr('bold', '  🎟️  BOOKING OUTCOMES'))
  console.log(`     ✅ Accepted       : ${clr('green',  `${accepted.length.toLocaleString()}`)} / ${allResults.length.toLocaleString()}`)
  console.log(`     🔒 Slot full      : ${clr('yellow', `${slotFull.length.toLocaleString()}`)}`)
  console.log(`     🔁 Already booked : ${clr('yellow', `${alreadyBooked.length.toLocaleString()}`)}`)
  console.log(`     ⏱️  Timeouts       : ${clr(timeouts.length > 0 ? 'red' : 'gray', `${timeouts.length.toLocaleString()}`)}`)
  console.log(`     🌐 Network errs   : ${clr(networkErrs.length > 0 ? 'red' : 'gray', `${networkErrs.length.toLocaleString()}`)}`)
  console.log(`     🔥 Server errs    : ${clr(serverErrs.length > 0 ? 'red' : 'gray', `${serverErrs.length.toLocaleString()}`)}`)
  console.log(`     ❓ Other          : ${clr(otherErrs.length > 0 ? 'yellow' : 'gray', `${otherErrs.length.toLocaleString()}`)}`)
  console.log('')

  if (TARGET_SLOTS.length > 1) {
    console.log(clr('bold', '  🕐 PER-SLOT BREAKDOWN (overbooking check)'))
    for (const [slot, stats] of Object.entries(slotStats)) {
      const overbooked = stats.accepted > MAX_PER_SLOT
      const indicator  = overbooked ? clr('red', '⚠️  OVERBOOKED') : clr('green', '✅ safe')
      console.log(`     ${slot}  →  ${stats.accepted} accepted / ${stats.total} tried  ${indicator}`)
    }
    console.log('')
  }

  // ─── VERDICT ──────────────────────────────────────────────────────────────
  const hasFailures     = timeouts.length + networkErrs.length + serverErrs.length > 0
  const failureRate     = ((timeouts.length + networkErrs.length + serverErrs.length) / allResults.length) * 100
  const slowP99         = p99 > 10000
  const overbooked      = Object.values(slotStats).some(s => s.accepted > MAX_PER_SLOT)

  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log(clr('bold', '                    🏁 VERDICT'))
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log('')

  if (!overbooked && !slowP99 && failureRate < 5) {
    console.log(clr('green', '  ✅✅✅  YOUR SYSTEM CAN HANDLE THE STORM!  ✅✅✅'))
    console.log('')
    console.log(clr('green', '  ✔ No overbooking detected'))
    console.log(clr('green', `  ✔ Failure rate: ${failureRate.toFixed(2)}% (acceptable < 5%)`))
    console.log(clr('green', `  ✔ p99 latency: ${p99}ms (ok < 10s)`))
  } else {
    console.log(clr('red', '  ⚠️⚠️⚠️   ISSUES DETECTED — REVIEW BELOW   ⚠️⚠️⚠️'))
    console.log('')
    if (overbooked) {
      console.log(clr('red', '  ❌ OVERBOOKING: Some slots accepted more than 30 people!'))
      console.log(clr('yellow', '     Fix: Ensure create_booking RPC uses FOR UPDATE locks (check schema.sql)'))
    } else {
      console.log(clr('green', '  ✔ No overbooking detected — atomic locks working'))
    }
    if (failureRate >= 5) {
      console.log(clr('red', `  ❌ HIGH FAILURE RATE: ${failureRate.toFixed(2)}% of requests errored/timed out`))
      console.log(clr('yellow', '     Causes: Supabase free tier connection limits, Node.js socket pool, or app crashes'))
      console.log(clr('yellow', '     Fix: Enable Supabase connection pooling (PgBouncer), upgrade plan, or rate-limit'))
    } else {
      console.log(clr('green', `  ✔ Failure rate ok (${failureRate.toFixed(2)}%)`))
    }
    if (slowP99) {
      console.log(clr('red', `  ❌ SLOW p99: ${p99}ms — some users waited >10s`))
      console.log(clr('yellow', '     Fix: Add a Cloudflare/Vercel edge layer, or reduce concurrency with a queue'))
    } else {
      console.log(clr('green', `  ✔ p99 latency ok (${p99}ms)`))
    }
  }

  console.log('')
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))

  // ─── RECOMMENDATIONS ──────────────────────────────────────────────────────
  console.log('')
  console.log(clr('bold', '  💡 RECOMMENDATIONS FOR TONIGHT:'))
  console.log('')
  console.log(`  1. ${clr('bold', 'Supabase connection pool')}`)
  console.log(`     Enable PgBouncer in Supabase Dashboard → Settings → Database`)
  console.log(`     This turns 100 simultaneous DB connections into thousands.`)
  console.log('')
  console.log(`  2. ${clr('bold', 'Vercel / edge deployment')}`)
  console.log(`     Deploy to Vercel — it auto-scales API routes to 1000s of serverless instances.`)
  console.log(`     ${clr('gray', 'npx vercel --prod')}`)
  console.log('')
  console.log(`  3. ${clr('bold', 'Slot page caching')} ${clr('gray', '(already in your /api/slots)')}`)
  console.log(`     Your slots endpoint has Cache-Control: s-maxage=5. Good. That protects the DB.`)
  console.log('')
  console.log(`  4. ${clr('bold', 'Rate limiting')} ${clr('gray', '(optional)')}`)
  console.log(`     Add 1 booking per IP per 10s via Vercel's Edge Middleware to block bots.`)
  console.log('')
  console.log(`  5. ${clr('bold', 'Monitor live')}`)
  console.log(`     Watch Supabase Dashboard → Reports → API during the rush.`)
  console.log('')

  // Cleanup
  if (DO_CLEANUP && accepted.length > 0) {
    const refs = accepted.map(r => r.ref).filter(Boolean)
    await cleanup(refs)
  } else if (accepted.length > 0) {
    console.log(clr('yellow', `  ⚠️  ${accepted.length} test bookings were created in your DB.`))
    console.log(clr('yellow', `     Run with --cleanup to auto-delete them, or delete manually via Supabase Dashboard.`))
    console.log(clr('gray',   `     (filter: nama LIKE 'LoadTest%')\n`))
  }
}

run().catch(err => {
  console.error(clr('red', `\n💥 Test crashed: ${err.message}`))
  process.exit(1)
})
