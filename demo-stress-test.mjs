const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials."); process.exit(1);
}

const EVENT_DATE = '2026-06-06'
const SLOT_TIME = '19:40' // 7:40 PM — last slot
const TOTAL_USERS = 50   // Simulate 50 people booking at once
const MAX_PER_SLOT = 30

async function bookUser(i) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/create_booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      p_slot_time: SLOT_TIME,
      p_event_date: EVENT_DATE,
      p_nama: `Stress Test User ${i}`,
      p_email: `stresstest${i}@demo.com`,
      p_no_telefon: `019${i.toString().padStart(7, '0')}`,
      p_umur: 25,
      p_daerah: 'Demo',
      p_negeri: 'Demo'
    })
  })
  return res.json()
}

async function cleanup(bookingRefs) {
  console.log('\n🧹 Cleaning up demo data...')
  for (const ref of bookingRefs) {
    await fetch(`${supabaseUrl}/rest/v1/bookings?booking_ref=eq.${ref}`, {
      method: 'DELETE',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    })
  }
  console.log(`   Deleted ${bookingRefs.length} test bookings.\n`)
}

async function run() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║        IMAN BOOKING - STRESS TEST DEMO          ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Simulating: ${TOTAL_USERS} people booking the SAME slot     ║`)
  console.log(`║  Slot limit: ${MAX_PER_SLOT} people max                      ║`)
  console.log(`║  Slot time:  7:40 PM on ${EVENT_DATE}            ║`)
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')
  console.log(`⏳ Sending all ${TOTAL_USERS} booking requests at the SAME TIME...\n`)

  const start = Date.now()

  // Fire ALL 50 requests simultaneously
  const results = await Promise.all(
    Array.from({ length: TOTAL_USERS }, (_, i) => bookUser(i + 1))
  )

  const elapsed = Date.now() - start
  const accepted = results.filter(r => r.success)
  const rejected = results.filter(r => !r.success)
  const slotFull = rejected.filter(r => r.error === 'SLOT_FULL')

  console.log('════════════════ RESULTS ════════════════\n')
  console.log(`  ✅ ACCEPTED:  ${accepted.length} people got a booking`)
  console.log(`  ❌ REJECTED:  ${rejected.length} people were turned away`)
  console.log(`  🔒 SLOT_FULL: ${slotFull.length} got "slot penuh" message`)
  console.log(`  ⏱️  Time:      ${elapsed}ms for all ${TOTAL_USERS} requests`)
  console.log('')

  if (accepted.length <= MAX_PER_SLOT) {
    console.log('╔══════════════════════════════════════════════════╗')
    console.log('║  ✅ PASSED — No overbooking! System is SAFE.    ║')
    console.log(`║  Only ${accepted.length}/${TOTAL_USERS} people were accepted (max ${MAX_PER_SLOT}).    ║`)
    console.log('╚══════════════════════════════════════════════════╝')
  } else {
    console.log('╔══════════════════════════════════════════════════╗')
    console.log('║  ⚠️  WARNING — Overbooking detected!            ║')
    console.log('╚══════════════════════════════════════════════════╝')
  }

  // Cleanup
  const refs = accepted.map(r => r.booking_ref)
  await cleanup(refs)

  console.log('Done! Demo data has been cleaned up.')
}

run()
