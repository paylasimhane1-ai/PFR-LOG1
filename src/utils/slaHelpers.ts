import { SlaSettings, Vehicle } from '../types';
import { parseTurkishDateTime } from './helpers';

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

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  bosaltmaMinutes: 60,
  yuklemeMinutes: 90,
  tahliyeMinutes: 60,
  warningThresholdPercent: 80
};

// İşlem türüne göre varsayılan hedef rampa işlem süreleri (dakika)
export const DEFAULT_SLA_TARGETS: Record<string, number> = {
  'Boşaltma': DEFAULT_SLA_SETTINGS.bosaltmaMinutes,
  'Yükleme': DEFAULT_SLA_SETTINGS.yuklemeMinutes,
  'Tahliye': DEFAULT_SLA_SETTINGS.tahliyeMinutes
};

export function getTargetMinutesForProcess(islemTuru?: string, slaSettings?: SlaSettings): number {
  const settings = slaSettings || DEFAULT_SLA_SETTINGS;
  if (islemTuru === 'Boşaltma') return Math.max(5, settings.bosaltmaMinutes || 60);
  if (islemTuru === 'Yükleme') return Math.max(5, settings.yuklemeMinutes || 90);
  if (islemTuru === 'Tahliye') return Math.max(5, settings.tahliyeMinutes || 60);
  return Math.max(5, DEFAULT_SLA_TARGETS[islemTuru || ''] || 60);
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
export function getVehicleStageTimes(
  vehicle: Vehicle,
  now: number = Date.now(),
  slaSettings?: SlaSettings
): VehicleStageTimes {
  const targetMinutes = getTargetMinutesForProcess(vehicle.islemTuru, slaSettings);
  const targetText = `${targetMinutes} Dk`;
  const warningRatio = Math.min(0.99, Math.max(0.5, (slaSettings?.warningThresholdPercent ?? DEFAULT_SLA_SETTINGS.warningThresholdPercent) / 100));

  const evrakReadyTs =
    vehicle.evrakHazirTimestamp ||
    parseTurkishDateTime(vehicle.evrakKayitTarihi) ||
    null;

  // 1. Tesis Kaydı -> Evrak Hazır Süresi
  let evrakHazirlikMinutes: number | null = null;
  let evrakHazirlikText = '-';

  if (evrakReadyTs && vehicle.girisTimestamp) {
    const diff = Math.max(0, evrakReadyTs - vehicle.girisTimestamp);
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
    rampStartTs = parseTurkishDateTime(vehicle.rampayaGirisTarihi);
  }

  const evrakEndTs = evrakReadyTs || vehicle.girisTimestamp;

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
    const rampExitParsed =
      vehicle.rampadanCikisTimestamp ||
      parseTurkishDateTime(vehicle.rampadanCikisTarihi) ||
      (vehicle.durum === 'ÇIKIŞ YAPTI'
        ? vehicle.cikisTimestamp || parseTurkishDateTime(vehicle.cikisTarihi)
        : null);
    const rampEndTs = rampExitParsed || (vehicle.durum === 'RAMPADA' ? now : null);

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
        if (rampaIslemMinutes >= targetMinutes * warningRatio) {
          status = 'WARNING';
        } else {
          status = 'NORMAL';
        }
      }
    }
  }

  // 4. Toplam Tesiste Kalma Süresi
  const exitTs = vehicle.cikisTimestamp || parseTurkishDateTime(vehicle.cikisTarihi) || now;
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
