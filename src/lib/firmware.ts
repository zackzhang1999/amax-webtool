import type { BmcVersion, FirmwareVersion, ServerModel } from '@/types';

function getLatestByDate<T extends { releaseDate: string }>(items: T[]): T | undefined {
  return [...items].sort((a, b) => {
    const byDate = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    return byDate || 0;
  })[0];
}

function getLatestSyncedByDate<T extends { releaseDate: string; status: 'synced' | 'pending' }>(items: T[]): T | undefined {
  return getLatestByDate(items.filter((item) => item.status === 'synced'));
}

export function getLatestFirmware(model: ServerModel): FirmwareVersion | undefined {
  return getLatestSyncedByDate(model.firmwares);
}

export function getLatestBmcVersion(model: ServerModel): BmcVersion | undefined {
  return getLatestSyncedByDate(model.bmcVersions);
}

export function getLatestBiosVersion(model: ServerModel): string {
  return getLatestFirmware(model)?.version || 'N/A';
}

export function getLatestBmcVersionText(model: ServerModel): string {
  return getLatestBmcVersion(model)?.version || 'N/A';
}
