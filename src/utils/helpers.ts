import { Vehicle } from '../types';

export function cleanPhone(tel?: string): string {
  if (!tel) return '';
  return tel.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
}

export function cleanPhoneForWa(tel?: string): string {
  if (!tel) return '';
  let cleaned = tel.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = '9' + cleaned;
  if (!cleaned.startsWith('90') && cleaned.length === 10) cleaned = '90' + cleaned;
  return cleaned;
}

export function formatExpectedDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDurationText(vehicle?: Vehicle): string {
  if (!vehicle || !vehicle.girisTimestamp) return '-';
  const end = vehicle.cikisTimestamp ? vehicle.cikisTimestamp : Date.now();
  const diffMs = end - vehicle.girisTimestamp;
  if (diffMs < 0) return '0 Dk';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let res = '';
  if (hours > 0) res += `${hours} Sa `;
  res += `${mins} Dk`;

  if (!vehicle.cikisTimestamp && vehicle.durum !== 'ÇIKIŞ YAPTI') {
    res += ' (Devam Ediyor)';
  }
  return res;
}

export function getStatusDurationLabel(durum: string): string {
  switch (durum) {
    case 'BEKLEMEDE':
      return 'Saha Bekleme Süresi';
    case 'EVRAK HAZIR':
      return 'Evrak Onaylandıktan Sonraki Süre';
    case 'RAMPADA':
      return 'Rampaya Girdikten Sonraki Süre';
    case 'ÇIKIŞ YAPTI':
      return 'Toplam Sahada Kalma Süresi';
    default:
      return 'Geçen Süre';
  }
}

export function getSpecificStatusDuration(vehicle?: Vehicle): string {
  if (!vehicle) return '-';
  let startTs = vehicle.girisTimestamp;

  if (vehicle.durum === 'EVRAK HAZIR') {
    startTs = vehicle.evrakHazirTimestamp || vehicle.girisTimestamp;
  } else if (vehicle.durum === 'RAMPADA') {
    startTs = vehicle.rampadaTimestamp || vehicle.girisTimestamp;
  } else if (vehicle.durum === 'ÇIKIŞ YAPTI') {
    startTs = vehicle.girisTimestamp;
  }

  const endTs = vehicle.cikisTimestamp ? vehicle.cikisTimestamp : Date.now();
  const diffMs = endTs - startTs;
  if (diffMs < 0) return '0 Dk';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let res = '';
  if (hours > 0) res += `${hours} Sa `;
  res += `${mins} Dk`;
  return res;
}

export function getRampDurationText(vehicle?: Vehicle | null): string {
  if (!vehicle) return '-';

  // Rampa başlangıç zamanı
  let startTs = vehicle.rampadaTimestamp || null;
  if (!startTs && vehicle.rampayaGirisTarihi) {
    const parsed = Date.parse(vehicle.rampayaGirisTarihi);
    if (!isNaN(parsed)) startTs = parsed;
  }

  if (!startTs) {
    if (vehicle.durum === 'RAMPADA') {
      startTs = vehicle.girisTimestamp;
    } else {
      return 'Henüz Rampaya Yanaşmadı';
    }
  }

  // Rampa bitiş / hesaplama zamanı
  let endTs = vehicle.rampadanCikisTimestamp || null;
  if (!endTs && vehicle.durum === 'ÇIKIŞ YAPTI') {
    endTs = vehicle.cikisTimestamp || Date.now();
  } else if (!endTs) {
    endTs = Date.now();
  }

  const diffMs = endTs - startTs;
  if (diffMs < 0) return '0 Dk';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let res = '';
  if (hours > 0) res += `${hours} Sa `;
  res += `${mins} Dk`;
  return res;
}

export function getStatusBadgeClass(durum: string): string {
  switch (durum) {
    case 'BEKLEMEDE':
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'EVRAK HAZIR':
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    case 'RAMPADA':
      return 'bg-purple-100 text-purple-800 border border-purple-300';
    case 'ÇIKIŞ YAPTI':
      return 'bg-slate-700 text-white border border-slate-600';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export function getRampStatusClass(durum: string): string {
  switch (durum) {
    case 'Boş':
      return 'bg-emerald-50 text-emerald-600 border-emerald-300';
    case 'Dolu':
      return 'bg-red-50 text-red-600 border-red-300';
    case 'Arızalı':
      return 'bg-amber-50 text-amber-600 border-amber-300';
    case 'Bakımda':
      return 'bg-blue-50 text-blue-600 border-blue-300';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export function formatToDisplayDateTime(timestamp?: number | null, dateStr?: string | null): string {
  if (timestamp && !isNaN(timestamp)) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  }

  if (dateStr && dateStr.trim()) {
    const str = dateStr.trim();
    if (str.includes('-') && !isNaN(Date.parse(str))) {
      const d = new Date(str);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    const parts = str.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const dParts = datePart.split('.');
      if (dParts.length === 3) {
        const day = dParts[0].padStart(2, '0');
        const month = dParts[1].padStart(2, '0');
        const year = dParts[2];
        const tParts = timePart.split(':');
        const hours = (tParts[0] || '00').padStart(2, '0');
        const minutes = (tParts[1] || '00').padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
      }
    }
    return str;
  }

  return '-';
}

export function formatDateTimeCustom(timestamp?: number | null, fallbackStr?: string | null): string {
  if (timestamp) {
    return formatToDisplayDateTime(timestamp);
  }
  return fallbackStr ? formatToDisplayDateTime(undefined, fallbackStr) : '-';
}

export function getDepoKayitTarihi(v?: Vehicle | null): string {
  if (!v) return '-';
  if (v.girisTimestamp) return formatToDisplayDateTime(v.girisTimestamp);
  if (v.girisTarihi) return formatToDisplayDateTime(undefined, v.girisTarihi);
  return '-';
}

export function getEvrakKayitTarihi(v?: Vehicle | null): string {
  if (!v) return '-';
  if (v.evrakHazirTimestamp) return formatToDisplayDateTime(v.evrakHazirTimestamp);
  if (v.evrakKayitTarihi) return formatToDisplayDateTime(undefined, v.evrakKayitTarihi);
  if (v.durum === 'BEKLEMEDE') {
    return 'Hazırlanıyor';
  }
  if (v.durum === 'EVRAK HAZIR' || v.durum === 'RAMPADA' || v.durum === 'ÇIKIŞ YAPTI') {
    if (v.rampadaTimestamp) return formatToDisplayDateTime(v.rampadaTimestamp);
    if (v.girisTimestamp) return formatToDisplayDateTime(v.girisTimestamp);
    return 'Onaylandı';
  }
  return 'Beklemede';
}

export const getEvrakHazirTarihi = getEvrakKayitTarihi;

export function getRampaGirisTarihi(v?: Vehicle | null): string {
  if (!v) return '-';
  if (v.rampadaTimestamp) return formatToDisplayDateTime(v.rampadaTimestamp);
  if (v.rampayaGirisTarihi) return formatToDisplayDateTime(undefined, v.rampayaGirisTarihi);
  if (v.durum === 'RAMPADA' || v.durum === 'ÇIKIŞ YAPTI') return 'Rampada';
  return 'Beklemede';
}

export function getRampaCikisTarihi(v?: Vehicle | null): string {
  if (!v) return '-';
  if (v.rampadanCikisTimestamp) return formatToDisplayDateTime(v.rampadanCikisTimestamp);
  if (v.cikisTimestamp) return formatToDisplayDateTime(v.cikisTimestamp);
  if (v.rampadanCikisTarihi) return formatToDisplayDateTime(undefined, v.rampadanCikisTarihi);
  if (v.cikisTarihi) return formatToDisplayDateTime(undefined, v.cikisTarihi);
  if (v.durum === 'ÇIKIŞ YAPTI') return 'Çıkış Yapıldı';
  if (v.durum === 'RAMPADA') return 'İşlem Sürüyor';
  return 'Beklemede';
}

export function exportVehiclesToCsv(
  vehicles: Vehicle[],
  getWarehouseName: (id: number) => string,
  getRampName: (id: number | null) => string
): void {
  if (!vehicles.length) {
    alert('Aktarılacak araç kaydı bulunamadı.');
    return;
  }

  let csvContent = '\uFEFF';
  const headers = [
    'Kayıt ID',
    'Depo Tesis',
    'Depoya Kayıt Tarihi',
    'Rampaya Giriş Tarihi',
    'Rampadan Çıkış Tarihi',
    'Geçen Süre',
    'Müşteri',
    'Çekici Plaka',
    'Dorse Plaka',
    'Konteynır No',
    'Şoför Adı',
    'Şoför Tel',
    'Nakliyeci',
    'Depo Türü',
    'İşlem Türü',
    'Son Rampa',
    'Durum',
    'Acil Durumu',
    'Açıklama'
  ];
  csvContent += headers.join(';') + '\n';

  vehicles.forEach((v) => {
    const row = [
      v.id,
      `"${getWarehouseName(v.depoId)}"`,
      `"${getDepoKayitTarihi(v)}"`,
      `"${getRampaGirisTarihi(v)}"`,
      `"${getRampaCikisTarihi(v)}"`,
      `"${getDurationText(v)}"`,
      `"${v.musteri || ''}"`,
      `"${v.cekiciPlaka || ''}"`,
      `"${v.dorsePlaka || ''}"`,
      `"${v.konteynirNo || ''}"`,
      `"${v.soforAd || ''}"`,
      `"${v.soforTel || ''}"`,
      `"${v.nakliyeFirmasi || ''}"`,
      `"${v.depoTuru || ''}"`,
      `"${v.islemTuru || ''}"`,
      `"${getRampName(v.rampaId)}"`,
      `"${v.durum || ''}"`,
      `"${v.isAcik ? 'ACİL ARAÇ' : 'Normal'}"`,
      `"${(v.aciklama || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `depo_arac_hareketleri_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadExpectedTemplateCsv(): void {
  const data = [
    ['Dorse Plaka', 'Çekici Plaka', 'Konteynır No', 'Müşteri / Firma', 'Şoför Ad Soyad', 'Şoför Telefon', 'TC Kimlik No', 'Açıklama', 'Depo Türü', 'İşlem Türü', 'Tahmini Varış Tarihi'],
    ['34 ABC 123', '34 XYZ 789', 'MSCU1234567', 'Örnek Lojistik A.Ş.', 'Ahmet Yılmaz', '05551112233', '12345678901', 'Öncelikli tahliye', 'Antrepo', 'Boşaltma', '2026-07-28T16:00'],
    ['35 DEF 456', '', '', 'Test Firması', 'Mehmet Demir', '05320000000', '', 'Randevulu araç', 'Serbest Depo', 'Yükleme', '2026-07-29T09:30']
  ];

  let csvContent = '\uFEFF';
  data.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'beklenen_araclar_sablonu.csv';
  link.click();
}

/**
 * Akıllı telefon ve tarayıcı kameralarından yüklenen yüksek çözünürlüklü fotoğrafları
 * Firestore'un 1 MB doküman boyut sınırını aşmamak ve hızlı kaydetmek için
 * maksimum 800px genişlik ve %70 JPEG kalitesinde sıkıştırır (~30-50 KB).
 */
export async function compressImageFile(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Fotoğraf dosyası okunamadı'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Fotoğraf formatı desteklenmiyor'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
