// ============================================
// IMAN Booking Slot - Constants & Configuration
// ============================================

export const EVENT_CONFIG = {
  name: 'IMAN Booking Slot',
  eventDate: '2026-06-06',
  slotDurationMinutes: 20,
  maxPerSlot: 30,
  startHour: 13, // 1 PM
  endHour: 21,   // 9 PM (last slot starts at 8:40 PM)
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
}

// Generate all slot times (1:00 PM to 8:40 PM, every 20 mins)
export function generateSlotTimes(): string[] {
  const slots: string[] = []
  for (let hour = EVENT_CONFIG.startHour; hour < EVENT_CONFIG.endHour; hour++) {
    for (let min = 0; min < 60; min += EVENT_CONFIG.slotDurationMinutes) {
      const h = hour.toString().padStart(2, '0')
      const m = min.toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
    }
  }
  return slots
}

export const ALL_SLOT_TIMES = generateSlotTimes()
// => ["13:00","13:20","13:40","14:00",...,"20:40"]

// Format 24h time to 12h display
export function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

// Format slot time range
export function formatSlotRange(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const endMin = m + EVENT_CONFIG.slotDurationMinutes
  const endH = h + Math.floor(endMin / 60)
  const endM = endMin % 60
  return `${formatTime(time24)} - ${formatTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`)}`
}

// Generate event dates array (single date event)
export function getEventDates(): string[] {
  return [EVENT_CONFIG.eventDate]
}

// Format date for display
export function formatDate(dateStr: string, lang: 'ms' | 'en' = 'ms'): string {
  const date = new Date(dateStr + 'T00:00:00')
  const days = lang === 'ms'
    ? ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = lang === 'ms'
    ? ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
}

// ============================================
// Bilingual Translations
// ============================================

export type Lang = 'ms' | 'en'

export const t = {
  ms: {
    siteTitle: 'IMAN Booking Slot',
    heroTitle: 'Tempah Slot Anda',
    heroSubtitle: '6 Jun 2026 — Pilih masa yang sesuai untuk anda',
    step1: 'Pilih Slot Masa',
    step2: 'Maklumat Peribadi',
    step3: 'Sahkan Tempahan',
    name: 'Nama',
    namePlaceholder: 'Nama penuh anda',
    email: 'Emel',
    emailPlaceholder: 'contoh@emel.com',
    phone: 'No Telefon',
    phonePlaceholder: '01X-XXXXXXX',
    age: 'Umur',
    agePlaceholder: 'Umur anda',
    area: 'Daerah',
    areaPlaceholder: 'Daerah anda',
    state: 'Negeri',
    statePlaceholder: 'Negeri anda',
    bookNow: 'Tempah Sekarang',
    booking: 'Menempah...',
    available: 'Tersedia',
    filling: 'Hampir Penuh',
    full: 'Penuh',
    selected: 'Dipilih',
    slotsLeft: 'slot lagi',
    confirmTitle: 'Pengesahan Tempahan',
    confirmMsg: 'Tempahan anda berjaya!',
    bookingRef: 'Rujukan Tempahan',
    date: 'Tarikh',
    time: 'Masa',
    showQR: 'Tunjukkan QR ini semasa kehadiran',
    downloadQR: 'Muat turun QR',
    backHome: 'Kembali ke Laman Utama',
    checkBooking: 'Semak Tempahan',
    checkPlaceholder: 'Masukkan rujukan atau emel',
    search: 'Cari',
    adminLogin: 'Log Masuk Admin',
    adminEmail: 'Emel',
    adminPassword: 'Kata Laluan',
    login: 'Log Masuk',
    logout: 'Log Keluar',
    dashboard: 'Papan Pemuka',
    totalBookings: 'Jumlah Tempahan',
    todayBookings: 'Tempahan Hari Ini',
    capacityUsed: 'Kapasiti Digunakan',
    exportCSV: 'Eksport CSV',
    tallyView: 'Paparan Tally',
    tableView: 'Paparan Jadual',
    noBookings: 'Tiada tempahan dijumpai',
    errorSlotFull: 'Maaf, slot ini sudah penuh. Sila pilih slot lain.',
    errorAlreadyBooked: 'Anda sudah membuat tempahan untuk tarikh ini.',
    errorGeneral: 'Ralat berlaku. Sila cuba lagi.',
    langSwitch: 'EN',
    allDates: 'Semua Tarikh',
    allSlots: 'Semua Slot',
    searchPlaceholder: 'Cari nama, emel, rujukan...',
    of: 'daripada',
    perSlot: 'setiap slot',
  },
  en: {
    siteTitle: 'IMAN Booking Slot',
    heroTitle: 'Book Your Slot',
    heroSubtitle: '6 June 2026 — Choose a time that suits you',
    step1: 'Select Time Slot',
    step2: 'Personal Details',
    step3: 'Confirm Booking',
    name: 'Name',
    namePlaceholder: 'Your full name',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    phone: 'Phone Number',
    phonePlaceholder: '01X-XXXXXXX',
    age: 'Age',
    agePlaceholder: 'Your age',
    area: 'Area',
    areaPlaceholder: 'Your area/district',
    state: 'State',
    statePlaceholder: 'Your state',
    bookNow: 'Book Now',
    booking: 'Booking...',
    available: 'Available',
    filling: 'Filling Up',
    full: 'Full',
    selected: 'Selected',
    slotsLeft: 'slots left',
    confirmTitle: 'Booking Confirmation',
    confirmMsg: 'Your booking is confirmed!',
    bookingRef: 'Booking Reference',
    date: 'Date',
    time: 'Time',
    showQR: 'Show this QR code at entry',
    downloadQR: 'Download QR',
    backHome: 'Back to Home',
    checkBooking: 'Check Booking',
    checkPlaceholder: 'Enter reference or email',
    search: 'Search',
    adminLogin: 'Admin Login',
    adminEmail: 'Email',
    adminPassword: 'Password',
    login: 'Log In',
    logout: 'Log Out',
    dashboard: 'Dashboard',
    totalBookings: 'Total Bookings',
    todayBookings: "Today's Bookings",
    capacityUsed: 'Capacity Used',
    exportCSV: 'Export CSV',
    tallyView: 'Tally View',
    tableView: 'Table View',
    noBookings: 'No bookings found',
    errorSlotFull: 'Sorry, this slot is full. Please choose another slot.',
    errorAlreadyBooked: 'You have already booked for this date.',
    errorGeneral: 'An error occurred. Please try again.',
    langSwitch: 'BM',
    allDates: 'All Dates',
    allSlots: 'All Slots',
    searchPlaceholder: 'Search name, email, reference...',
    of: 'of',
    perSlot: 'per slot',
  },
} as const
