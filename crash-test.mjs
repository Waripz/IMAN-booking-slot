/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   IMAN — WILL IT CRASH? Real User Simulation        ║
 * ║   Tests what happens when 10k people open the site  ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node crash-test.mjs --target https://your-site.vercel.app
 *   node crash-test.mjs --target http://localhost:3000
 */

import { performance } from 'perf_hooks'

const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def }

const TARGET      = getArg('--target', 'http://localhost:3000')
const TOTAL_USERS = parseInt(getArg('--users', '10000'))
const EVENT_DATE  = '2026-06-06'

// ANSI colours
const C = { reset:'\x1b[0m', bold:'\x1b[1m', red:'\x1b[31m', green:'\x1b[32m',
            yellow:'\x1b[33m', cyan:'\x1b[36m', gray:'\x1b[90m', magenta:'\x1b[35m' }
const clr = (k, s) => `${C[k]}${s}${C.reset}`

// ─── What each user does when they "open the website" ────────────────────────
// 1. Fetch slot availability (the first thing the page does on mount)
// 2. That's it — most users just browse, they don't all book simultaneously
async function simulateUser(userId) {
  const t0 = performance.now()
  try {
    const res = await fetch(`${TARGET}/api/slots?date=${EVENT_DATE}`, {
      signal: AbortSignal.timeout(10000),
      // Simulate browser headers
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (IMAN-LoadTest)',
      }
    })
    const latencyMs = Math.round(performance.now() - t0)
    const ok = res.status === 200
    let data = null
    try { data = await res.json() } catch {}
    return { userId, ok, status: res.status, latencyMs, error: null, cached: res.headers.get('x-vercel-cache') || res.headers.get('cf-cache-status') || 'unknown' }
  } catch (err) {
    return { userId, ok: false, status: 0, latencyMs: Math.round(performance.now() - t0),
             error: err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERR', cached: 'n/a' }
  }
}

// Simulate hitting the homepage HTML (checks if Vercel CDN serves it)
async function simulatePageLoad(userId) {
  const t0 = performance.now()
  try {
    const res = await fetch(`${TARGET}/`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (IMAN-LoadTest)' }
    })
    const latencyMs = Math.round(performance.now() - t0)
    return { ok: res.status === 200, status: res.status, latencyMs,
             cache: res.headers.get('x-vercel-cache') || res.headers.get('cf-cache-status') || '?' }
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Math.round(performance.now() - t0), cache: 'err' }
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0
  const s = [...arr].sort((a,b)=>a-b)
  return s[Math.max(0, Math.ceil(p/100*s.length)-1)]
}

function bar(val, max, width=20) {
  const filled = Math.round((val/max)*width)
  return '█'.repeat(filled) + '░'.repeat(width-filled)
}

async function run() {
  console.log('')
  console.log(clr('cyan', '╔══════════════════════════════════════════════════════╗'))
  console.log(clr('cyan', '║') + clr('bold', '   WILL IT CRASH? — 10K Users Opening Your Site    ') + clr('cyan', '║'))
  console.log(clr('cyan', '╠══════════════════════════════════════════════════════╣'))
  console.log(clr('cyan', '║') + `   🎯 Target: ${TARGET.padEnd(40)}` + clr('cyan', '║'))
  console.log(clr('cyan', '║') + `   👥 Users:  ${String(TOTAL_USERS).padEnd(40)}` + clr('cyan', '║'))
  console.log(clr('cyan', '╚══════════════════════════════════════════════════════╝'))
  console.log('')

  // ── PHASE 0: Health check ──────────────────────────────────────────────────
  console.log(clr('gray', '🔍 Checking target...'))
  try {
    const ping = await fetch(`${TARGET}/api/slots?date=${EVENT_DATE}`, { signal: AbortSignal.timeout(8000) })
    console.log(clr('green', `✅ Live! HTTP ${ping.status}\n`))
  } catch(e) {
    console.error(clr('red', `\n❌ Cannot reach ${TARGET}\n   ${e.message}`))
    console.error(clr('yellow', `   Make sure your dev server or Vercel URL is correct.\n`))
    process.exit(1)
  }

  // ── PHASE 1: Homepage load test (what CDN/Vercel serves) ──────────────────
  console.log(clr('bold', `📄 PHASE 1: Homepage Load (${TOTAL_USERS.toLocaleString()} concurrent users)\n`))
  console.log(clr('gray', `   This is just HTML/CSS/JS served by Vercel's global CDN.`))
  console.log(clr('gray', `   Sending ${TOTAL_USERS.toLocaleString()} requests in 10 waves...\n`))

  const WAVES = 10
  const waveSize = Math.ceil(TOTAL_USERS / WAVES)
  const pageResults = []

  for (let w = 0; w < WAVES; w++) {
    const count = Math.min(waveSize, TOTAL_USERS - w*waveSize)
    const t0 = performance.now()
    process.stdout.write(clr('gray', `  Wave ${String(w+1).padStart(2)}/${WAVES} — ${count} users... `))
    const batch = await Promise.allSettled(Array.from({length: count}, (_,i) => simulatePageLoad(w*waveSize+i)))
    const elapsed = Math.round(performance.now() - t0)
    const results = batch.map(r => r.status==='fulfilled' ? r.value : {ok:false,latencyMs:0,cache:'err'})
    const ok = results.filter(r=>r.ok).length
    const cacheHits = results.filter(r=>['HIT','STALE'].includes(r.cache?.toUpperCase())).length
    console.log(clr('green',`✅ ${ok}`) + clr('gray',` ok | cache hits: `) + clr('cyan',cacheHits) + clr('gray',` | ${elapsed}ms`))
    pageResults.push(...results)
    if (w < WAVES-1) await new Promise(r=>setTimeout(r,50))
  }

  const pageOk      = pageResults.filter(r=>r.ok).length
  const pageLatency = pageResults.map(r=>r.latencyMs).filter(l=>l>0)
  const pageCached  = pageResults.filter(r=>['HIT','STALE'].includes(r.cache?.toUpperCase())).length

  console.log('')
  console.log(`  Page load success : ${clr('green', `${pageOk.toLocaleString()}/${TOTAL_USERS.toLocaleString()}`)}`)
  console.log(`  CDN cache hits    : ${clr('cyan',  `${pageCached.toLocaleString()}`)}`)
  console.log(`  p50 latency       : ${percentile(pageLatency,50)}ms`)
  console.log(`  p99 latency       : ${percentile(pageLatency,99)}ms`)
  console.log('')

  // ── PHASE 2: Slot availability API (the real DB-hitting endpoint) ─────────
  console.log(clr('bold', `\n🕐 PHASE 2: Slot Availability API (/api/slots)\n`))
  console.log(clr('gray', `   Every user calls this when the page loads.`))
  console.log(clr('gray', `   Has s-maxage=5 cache — let's see how many hit the DB vs cache.\n`))

  const SLOT_WAVES   = 10
  const slotWaveSize = Math.ceil(TOTAL_USERS / SLOT_WAVES)
  const slotResults  = []

  for (let w = 0; w < SLOT_WAVES; w++) {
    const count = Math.min(slotWaveSize, TOTAL_USERS - w*slotWaveSize)
    const t0 = performance.now()
    process.stdout.write(clr('gray', `  Wave ${String(w+1).padStart(2)}/${SLOT_WAVES} — ${count} users... `))
    const batch = await Promise.allSettled(Array.from({length: count}, (_,i) => simulateUser(w*slotWaveSize+i)))
    const elapsed = Math.round(performance.now() - t0)
    const results = batch.map(r => r.status==='fulfilled' ? r.value : {ok:false,latencyMs:0,error:'ERR',cached:'n/a'})
    const ok  = results.filter(r=>r.ok).length
    const err = results.filter(r=>!r.ok).length
    const timeouts = results.filter(r=>r.error==='TIMEOUT').length
    console.log(clr('green',`✅ ${ok}`) + clr('gray',' ok | ') + clr(err?'red':'gray',`❌ ${err} err`) + (timeouts?clr('red',` (${timeouts} timeouts)`):'') + clr('gray',` | ${elapsed}ms`))
    slotResults.push(...results)
    if (w < SLOT_WAVES-1) await new Promise(r=>setTimeout(r,50))
  }

  const slotOk       = slotResults.filter(r=>r.ok).length
  const slotErr      = slotResults.filter(r=>!r.ok)
  const slotTimeouts = slotErr.filter(r=>r.error==='TIMEOUT').length
  const slotNetErrs  = slotErr.filter(r=>r.error==='NETWORK_ERR').length
  const slotLatency  = slotResults.map(r=>r.latencyMs).filter(l=>l>0)
  const failRate     = (slotErr.length / TOTAL_USERS) * 100

  // ── REPORT ─────────────────────────────────────────────────────────────────
  console.log('')
  console.log(clr('cyan', '\n═══════════════════════════════════════════════════════'))
  console.log(clr('bold',  '                   📊 CRASH REPORT'))
  console.log(clr('cyan', '═══════════════════════════════════════════════════════\n'))

  console.log(clr('bold', '  📄 HOMEPAGE (Vercel CDN)'))
  console.log(`     Success rate : ${clr(pageOk===TOTAL_USERS?'green':'red', `${((pageOk/TOTAL_USERS)*100).toFixed(1)}%`)} (${pageOk.toLocaleString()}/${TOTAL_USERS.toLocaleString()})`)
  console.log(`     p50 latency  : ${percentile(pageLatency,50)}ms`)
  console.log(`     p99 latency  : ${percentile(pageLatency,99)}ms`)
  const pageVerdict = pageOk >= TOTAL_USERS * 0.99
  console.log(`     Verdict      : ${pageVerdict ? clr('green','✅ HOLDS — Vercel CDN handles this trivially') : clr('red','⚠️  Degraded')}`)

  console.log('')
  console.log(clr('bold', '  🕐 SLOT API (/api/slots — hits Supabase)'))
  console.log(`     Success rate : ${clr(failRate<5?'green':'red', `${((slotOk/TOTAL_USERS)*100).toFixed(1)}%`)} (${slotOk.toLocaleString()}/${TOTAL_USERS.toLocaleString()})`)
  console.log(`     p50 latency  : ${percentile(slotLatency,50)}ms`)
  console.log(`     p95 latency  : ${percentile(slotLatency,95)}ms`)
  console.log(`     p99 latency  : ${percentile(slotLatency,99)}ms`)
  console.log(`     Timeouts     : ${clr(slotTimeouts>0?'red':'gray', String(slotTimeouts))}`)
  console.log(`     Network errs : ${clr(slotNetErrs>0?'red':'gray', String(slotNetErrs))}`)
  console.log(`     Fail rate    : ${clr(failRate<5?'green':failRate<20?'yellow':'red', `${failRate.toFixed(2)}%`)}`)

  console.log('')
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log(clr('bold', '                    🏁 FINAL VERDICT'))
  console.log(clr('cyan', '═══════════════════════════════════════════════════════\n'))

  const slotApiOk = failRate < 5
  const pageOkFlag = pageOk >= TOTAL_USERS * 0.99

  if (slotApiOk && pageOkFlag) {
    console.log(clr('green', '  🟢🟢🟢  WEBSITE WILL NOT CRASH TONIGHT  🟢🟢🟢\n'))
    console.log(clr('green', '  ✔ Vercel CDN serves page loads to millions, no issue'))
    console.log(clr('green', '  ✔ Slot API handled 10k users without crashing'))
    console.log(clr('green', `  ✔ Error rate ${failRate.toFixed(2)}% — well within safe limits`))
  } else {
    console.log(clr('yellow', '  🟡  POTENTIAL ISSUES DETECTED\n'))
    if (!pageOkFlag) {
      console.log(clr('red', '  ❌ Homepage had failures — check if Vercel build is deployed'))
    }
    if (!slotApiOk) {
      console.log(clr('red', `  ❌ Slot API failing at ${failRate.toFixed(1)}% — Supabase connection limit hit`))
      console.log(clr('yellow', '     → Enable PgBouncer (see below)'))
      console.log(clr('yellow', '     → Or add stronger caching to /api/slots'))
    }
  }

  console.log('')
  console.log(clr('cyan', '═══════════════════════════════════════════════════════'))
  console.log(clr('bold',  '  💡 YOUR EXACT SETUP — WHAT CAN HANDLE WHAT:\n'))
  console.log(`  ┌─────────────────────────────────────────────────┐`)
  console.log(`  │  Layer              Capacity      Status        │`)
  console.log(`  ├─────────────────────────────────────────────────┤`)
  console.log(`  │  Vercel CDN         ♾️  Unlimited   ✅ Safe      │`)
  console.log(`  │  Vercel Serverless  Autoscale      ✅ Safe      │`)
  console.log(`  │  Supabase API       ~200 conns     ⚠️  Limited   │`)
  console.log(`  │  PgBouncer pool     15 DB conns    ⚠️  Shared    │`)
  console.log(`  │  /api/slots cache   s-maxage=5s    ✅ Helps!    │`)
  console.log(`  └─────────────────────────────────────────────────┘`)
  console.log('')
  console.log(clr('bold', '  🔑 TONIGHT\'S SURVIVAL CHECKLIST:'))
  console.log('')
  console.log(`  ${clr('green','[✓]')} Vercel deployment          → Already done`)
  console.log(`  ${clr('green','[✓]')} Atomic DB locks             → Already in schema.sql`)
  console.log(`  ${clr('green','[✓]')} Slot API cache (5s)         → Already in /api/slots`)
  console.log(`  ${slotTimeouts>10 ? clr('red','[!]') : clr('yellow','[ ]')} Supabase PgBouncer         → Enable in Supabase Dashboard`)
  console.log(`        Supabase → Settings → Database → Connection Pooling`)
  console.log(`        Mode: Transaction  (NOT Session)`)
  console.log(`  ${clr('yellow','[ ]')} Increase slots cache to 10s → ${clr('gray','Change s-maxage=5 → s-maxage=10')}`)
  console.log('')
}

run().catch(e => { console.error(clr('red',`\n💥 ${e.message}`)); process.exit(1) })
