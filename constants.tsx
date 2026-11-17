
import { Task, SOPItem, Division } from './types';

export const MOCK_USER = {
  id: 'EMP001',
  name: 'Budi Santoso',
  division: 'Stylist' as Division,
  role: 'Senior Stylist',
  avatar: 'https://picsum.photos/seed/budi/200'
};

export const MOCK_TASKS: Task[] = [
  { jenis: 'Harian', tugas: 'Sterilisasi gunting dan sisir', jabatan: 'Stylist' },
  { jenis: 'Harian', tugas: 'Restock produk sampo di rak', jabatan: 'Stylist' },
  { jenis: 'Mingguan', tugas: 'Membersihkan filter AC area cuci', jabatan: 'Stylist' },
  { jenis: 'Bulanan', tugas: 'Audit inventaris cat rambut', jabatan: 'Stylist' },
  { jenis: 'Harian', tugas: 'Membersihkan workstation kuku', jabatan: 'Therapist' },
];

export const SOP_DATA: SOPItem[] = [
  {
    id: 'sop1',
    title: 'Pencucian Rambut (Hair Wash)',
    category: 'Stylist',
    steps: [
      'Basahi rambut dengan air hangat kuku.',
      'Aplikasi sampo sesuai jenis rambut klien.',
      'Pijat kepala dengan gerakan melingkar selama 5 menit.',
      'Bilas hingga bersih.',
      'Gunakan kondisioner di ujung rambut saja.'
    ],
    tips: 'Pastikan suhu air selalu ditanyakan kepada klien sebelum membasahi rambut.'
  },
  {
    id: 'sop2',
    title: 'Manikur Dasar',
    category: 'Therapist',
    steps: [
      'Bersihkan sisa kutek lama.',
      'Rendam jari dalam air hangat sabun.',
      'Rapikan kutikula dengan hati-hati.',
      'Potong dan kikir kuku sesuai bentuk keinginan klien.',
      'Aplikasi base coat.'
    ],
    tips: 'Selalu gunakan alat yang baru saja disterilkan dari UV box.'
  }
];

export const MOCK_MATERI = {
  judul: "Etika Pelayanan Premium",
  sub_judul: "Modul 1: Komunikasi Efektif",
  bab: "Pelayanan",
  isi: "Dalam industri jasa kecantikan, senyum adalah alat utama. Selalu mulai sesi dengan konsultasi mendalam untuk memahami keinginan klien. Gunakan bahasa tubuh yang terbuka dan dengarkan setiap keluhan dengan empati tinggi."
};

export const MOCK_PESAN_MANAGER = {
  pesan: "Hari ini kita kedatangan tamu VIP, mohon kerjasamanya untuk menjaga kebersihan workstation masing-masing. Semangat!",
  nama: "Siska Amanda",
  jabatan: "Store Manager"
};

export const MOCK_LOKASI = [
  { id: 1, nama: 'Flow Pusat' },
  { id: 2, nama: 'Flow Mall Area' },
  { id: 3, nama: 'Flow Town Square' }
];
