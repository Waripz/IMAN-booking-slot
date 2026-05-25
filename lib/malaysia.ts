// ============================================
// Malaysian States & Districts (Negeri & Daerah)
// ============================================

export const MALAYSIA_STATES: Record<string, string[]> = {
  'Johor': [
    'Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai',
    'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak',
  ],
  'Kedah': [
    'Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu',
    'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena',
    'Sik', 'Yan',
  ],
  'Kelantan': [
    'Bachok', 'Gua Musang', 'Jeli', 'Kota Bharu', 'Kuala Krai',
    'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat',
  ],
  'Melaka': [
    'Alor Gajah', 'Jasin', 'Melaka Tengah',
  ],
  'Negeri Sembilan': [
    'Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau',
    'Seremban', 'Tampin',
  ],
  'Pahang': [
    'Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan',
    'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh',
  ],
  'Perak': [
    'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian',
    'Kinta', 'Kuala Kangsar', 'Larut, Matang & Selama', 'Manjung',
    'Muallim', 'Perak Tengah',
  ],
  'Perlis': [
    'Perlis',
  ],
  'Pulau Pinang': [
    'Barat Daya', 'Seberang Perai Selatan', 'Seberang Perai Tengah',
    'Seberang Perai Utara', 'Timur Laut',
  ],
  'Sabah': [
    'Beaufort', 'Beluran', 'Keningau', 'Kinabatangan', 'Kota Belud',
    'Kota Kinabalu', 'Kota Marudu', 'Kudat', 'Kunak', 'Lahad Datu',
    'Nabawan', 'Papar', 'Penampang', 'Pitas', 'Putatan',
    'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Tambunan',
    'Tawau', 'Tenom', 'Tongod', 'Tuaran',
  ],
  'Sarawak': [
    'Betong', 'Bintulu', 'Kapit', 'Kuching', 'Limbang',
    'Miri', 'Mukah', 'Samarahan', 'Sarikei', 'Serian',
    'Sibu', 'Sri Aman',
  ],
  'Selangor': [
    'Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat',
    'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang',
  ],
  'Terengganu': [
    'Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus',
    'Kuala Terengganu', 'Marang', 'Setiu',
  ],
  'W.P. Kuala Lumpur': [
    'Kuala Lumpur',
  ],
  'W.P. Labuan': [
    'Labuan',
  ],
  'W.P. Putrajaya': [
    'Putrajaya',
  ],
}

export const NEGERI_LIST = Object.keys(MALAYSIA_STATES).sort()
