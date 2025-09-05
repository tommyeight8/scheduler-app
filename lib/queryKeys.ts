// lib/queryKeys.ts
export const qk = {
  services: () => ["services"] as const,
  nailTechs: () => ["nail-techs"] as const,
  service: (id: number) => ["service", id] as const,
  apptsByDate: (isoDate: string) => ["appointments", isoDate] as const,
};
