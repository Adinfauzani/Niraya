import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { maintenanceConfig } from "@/server/db/schema/platform";

const DEFAULT_ESTIMATED_HOURS = 48;

export type MaintenanceConfig = {
  enabled: boolean;
  message: string | null;
  startedAt: Date | null;
  estimatedEndAt: Date | null;
};

const DISABLED_DEFAULT: MaintenanceConfig = {
  enabled: false,
  message: null,
  startedAt: null,
  estimatedEndAt: null,
};

/**
 * Baca konfigurasi maintenance (single row Id="default").
 *
 * Jika tabelnya belum ada (migration belum dijalankan), kembalikan default
 * disabled alih-alih melempar — endpoint yang memerlukan pengecekan ini
 * (business mutate, checkout, storefront) tidak boleh 500 karena absennya
 * satu tabel. Kode `42P01` (relation does not exist) adalah sinyal yang jelas.
 */
export async function getMaintenanceConfig(database: any = db): Promise<MaintenanceConfig> {
  try {
    const [config] = await database
      .select()
      .from(maintenanceConfig)
      .where(eq(maintenanceConfig.id, "default"))
      .limit(1);

    if (!config) return DISABLED_DEFAULT;

    return {
      enabled: config.enabled,
      message: config.message ?? null,
      startedAt: config.startedAt ?? null,
      estimatedEndAt: config.estimatedEndAt ?? null,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "42P01") return DISABLED_DEFAULT;
    throw error;
  }
}

/** Hitung estimatedEndAt dari startedAt jika belum diatur secara eksplisit. */
export function resolveEstimatedEndAt(config: MaintenanceConfig): Date | null {
  if (config.estimatedEndAt) return config.estimatedEndAt;
  if (config.enabled && config.startedAt) {
    return new Date(
      config.startedAt.getTime() + DEFAULT_ESTIMATED_HOURS * 60 * 60 * 1000
    );
  }
  return null;
}