
export type Division = 'Stylist' | 'Therapist' | 'Training' | 'Kasir' | 'PKL' | 'Manager';

export interface User {
  id_pegawai?: string;
  id_pos?: string;
  nama: string;
  email: string;
  jabatan: string;
  jamKhusus?: string;
  ttl?: string;
  alamat?: string;
  wa?: string;
  fotoKTP?: string;
  kNama?: string;
  kHub?: string;
  kWa?: string;
  joinDate?: string;
  join_date?: string;
  Join_Date?: string;
  masuk_tgl?: string;
  Masuk_Tgl?: string;
  timestamp?: string;
  Timestamp?: string;
  keluar_tgl?: string;
  Keluar_Tgl?: string;
}

export interface Task {
  jenis: 'Harian' | 'Mingguan' | 'Bulanan';
  tugas: string;
  jabatan: string;
}

export interface SOPItem {
  id: string;
  title: string;
  category: string;
  steps: string[];
  tips: string;
}

export interface MateriItem {
  judul: string;
  sub_judul: string;
  bab: string;
  isi: string;
}
