-- Seed awal kurikulum 5 Unit Pasanku
-- Jalankan setelah 0001_initial_schema.sql

INSERT INTO public.units (id, title, description, order_number, status) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Sapaan dan Ungkapan Dasar', 'Mengenal Bahasa Pasan, sapaan saat bertemu, menanyakan kabar, ucapan terima kasih, dan perpisahan.', 1, 'published'),
  ('11111111-1111-4111-8111-111111111102', 'Perkenalan Diri dan Identitas', 'Kata ganti orang, menyebutkan nama, asal daerah, dan tempat tinggal.', 2, 'published'),
  ('11111111-1111-4111-8111-111111111103', 'Angka dan Benda di Sekitar', 'Mengenal angka 1-10 serta nama benda sehari-hari dan jumlahnya.', 3, 'published'),
  ('11111111-1111-4111-8111-111111111104', 'Keluarga dan Kehidupan Sehari-hari', 'Anggota keluarga, orang sekitar, makanan, minuman, dan aktivitas harian.', 4, 'published'),
  ('11111111-1111-4111-8111-111111111105', 'Ungkapan dan Percakapan Sederhana', 'Menyusun ungkapan dan memahami percakapan sederhana dalam keseharian.', 5, 'published')
ON CONFLICT (order_number) DO NOTHING;

-- Catatan: akun Admin awal sebaiknya dibuat lewat Supabase Dashboard / Admin API
-- lalu peran diubah secara terkontrol di tabel public.profiles:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<ADMIN_UUID>';
