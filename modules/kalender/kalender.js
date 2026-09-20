window.handleTambahAgendaSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-agenda");
  const dbClient = getKalenderDbClient();
  const userProfile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);

  if (!dbClient) {
    alert("Koneksi database tidak tersedia.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const isTampilDashboard = document.getElementById("agenda-tampilkan-dashboard").checked;

    // [PERBAIKAN] Menggunakan nama kolom resmi Supabase: tampilkan_di_dashboard
    const payload = {
      judul: document.getElementById("agenda-judul").value.trim(),
      kategori: document.getElementById("agenda-kategori").value,
      prioritas: document.getElementById("agenda-prioritas").value,
      tanggal_mulai: document.getElementById("agenda-tgl-mulai").value,
      tanggal_selesai: document.getElementById("agenda-tgl-selesai").value || null,
      waktu_kegiatan: document.getElementById("agenda-waktu").value.trim() || null,
      lokasi: document.getElementById("agenda-lokasi").value.trim() || null,
      keterangan: document.getElementById("agenda-keterangan").value.trim() || null,
      tampilkan_di_dashboard: isTampilDashboard, // <-- Diganti ke tampilkan_di_dashboard
      created_by: userProfile?.id || null
    };

    const { error } = await dbClient.from("agenda_kegiatan").insert(payload);
    if (error) throw error;

    alert("Agenda kegiatan berhasil ditambahkan!");
    window.closeTambahAgendaModal();
    await window.loadAgendaData();
  } catch (err) {
    alert("Gagal menambahkan agenda: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Agenda";
  }
};