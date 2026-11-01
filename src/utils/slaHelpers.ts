import { Vehicle } from '../types';

export interface VehicleStageTimes {
  // Aşamalar
  evrakHazirlikMinutes: number | null;
  evrakHazirlikText: string;
  
  rampaBeklemeMinutes: number | null;
  rampaBeklemeText: string;
  
  rampaIslemMinutes: number | null;
  rampaIslemText: string;
  
  toplamTesisMinutes: number;
  toplamTesisText: string;
  
  // SLA & Gecikme
  targetMinutes: number;
  targetText: string;
  isOverdue: boolean;
  delayMinutes: number;
  delayText: string;
  remainingMinutes: number;
  progressPercent: number;
  status: 'NORMAL' | 'WARNING' | 'OVERDUE';
}

// İşlem türüne göre varsayılan hedef rampa işlem süreleri (dakika)
export const DEFAULT_SLA_TARGETS: Record<string, number> = {
  'Boşaltma': 60,
  'Yükleme': 90,
  'Tahliye': 60
};

export function getTargetMinutesForProcess(islemTuru?: string): number {
  if (!islemTuru) return 60;
  return DEFAULT_SLA_TARGETS[islemTuru] || 60;
}

export function formatMinutesToText(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) return '-';
  const totalM = Math.floor(minutes);
  const hours = Math.floor(totalM / 60);
  const mins = totalM % 60;

  if (hours > 0) {
    return `${hours} Sa ${mins} Dk`;
  }
  return `${mins} Dk`;
}

/**
 * Bir aracın tüm yaşam döngüsü aşama sürelerini ve rampa gecikme durumunu hesaplar.
 */
export function getVehicleStageTimes(vehicle: Vehicle, now: number = Date.now()): VehicleStageTimes {
  const targetMinutes = getTargetMinutesForProcess(vehicle.islemTuru);
  const targetText = `${targetMinutes} Dk`;

  // 1. Tesis Kaydı -> Evrak Hazır Süresi
  let evrakHazirlikMinutes: number | null = null;
  let evrakHazirlikText = '-';

  if (vehicle.evrakHazirTimestamp && vehicle.girisTimestamp) {
    const diff = Math.max(0, vehicle.evrakHazirTimestamp - vehicle.girisTimestamp);
    evrakHazirlikMinutes = Math.floor(diff / (1000 * 60));
    evrakHazirlikText = formatMinutesToText(evrakHazirlikMinutes);
  } else if (vehicle.durum === 'BEKLEMEDE' && vehicle.girisTimestamp) {
    const diff = Math.max(0, now - vehicle.girisTimestamp);
    evrakHazirlikMinutes = Math.floor(diff / (1000 * 60));
    evrakHazirlikText = `${formatMinutesToText(evrakHazirlikMinutes)} (Hazırlanıyor)`;
  }

  // 2. Evrak Hazır -> Rampa Giriş Süresi (Rampa Bekleme)
  let rampaBeklemeMinutes: number | null = null;
  let rampaBeklemeText = '-';

  // Rampaya giriş referans zamanı
  let rampStartTs = vehicle.rampadaTimestamp || null;
  if (!rampStartTs && vehicle.rampayaGirisTarihi) {
    const parsed = Date.parse(vehicle.rampayaGirisTarihi);
    if (!isNaN(parsed)) rampStartTs = parsed;
  }

  const evrakEndTs = vehicle.evrakHazirTimestamp || vehicle.girisTimestamp;

  if (rampStartTs && evrakEndTs) {
    const diff = Math.max(0, rampStartTs - evrakEndTs);
    rampaBeklemeMinutes = Math.floor(diff / (1000 * 60));
    rampaBeklemeText = formatMinutesToText(rampaBeklemeMinutes);
  } else if (vehicle.durum === 'EVRAK HAZIR' && evrakEndTs) {
    const diff = Math.max(0, now - evrakEndTs);
    rampaBeklemeMinutes = Math.floor(diff / (1000 * 60));
    rampaBeklemeText = `${formatMinutesToText(rampaBeklemeMinutes)} (Rampa Bekliyor)`;
  }

  // 3. Rampa İşlem Süresi & Gecikme Takibi
  let rampaIslemMinutes: number | null = null;
  let rampaIslemText = '-';
  let isOverdue = false;
  let delayMinutes = 0;
  let delayText = '';
  let remainingMinutes = targetMinutes;
  let progressPercent = 0;
  let status: 'NORMAL' | 'WARNING' | 'OVERDUE' = 'NORMAL';

  if (rampStartTs) {
    const rampEndTs = vehicle.rampadanCikisTimestamp || (vehicle.durum === 'RAMPADA' ? now : null);
    if (rampEndTs) {
      const diff = Math.max(0, rampEndTs - rampStartTs);
      rampaIslemMinutes = Math.floor(diff / (1000 * 60));
      rampaIslemText = formatMinutesToText(rampaIslemMinutes);

      progressPercent = Math.min(150, Math.round((rampaIslemMinutes / targetMinutes) * 100));

      if (rampaIslemMinutes > targetMinutes) {
        isOverdue = true;
        delayMinutes = rampaIslemMinutes - targetMinutes;
        delayText = `+${formatMinutesToText(delayMinutes)}`;
        remainingMinutes = 0;
        status = 'OVERDUE';
      } else {
        remainingMinutes = targetMinutes - rampaIslemMinutes;
        if (rampaIslemMinutes >= targetMinutes * 0.8) {
          status = 'WARNING';
        } else {
          status = 'NORMAL';
        }
      }
    }
  }

  // 4. Toplam Tesiste Kalma Süresi
  const exitTs = vehicle.cikisTimestamp || now;
  const totalDiff = Math.max(0, exitTs - vehicle.girisTimestamp);
  const toplamTesisMinutes = Math.floor(totalDiff / (1000 * 60));
  const toplamTesisText = formatMinutesToText(toplamTesisMinutes);

  return {
    evrakHazirlikMinutes,
    evrakHazirlikText,
    rampaBeklemeMinutes,
    rampaBeklemeText,
    rampaIslemMinutes,
    rampaIslemText,
    toplamTesisMinutes,
    toplamTesisText,
    targetMinutes,
    targetText,
    isOverdue,
    delayMinutes,
    delayText,
    remainingMinutes,
    progressPercent,
    status
  };
}
