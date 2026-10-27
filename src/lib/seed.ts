import type { AppData } from './types';

/** Empty-by-default workspace for new accounts. Sample/demo records must never be auto-loaded. */
export const starterData: AppData = {
  projects: [],
  tasks: [],
  sessions: [],
  notes: [],
  releases: [],
  plans: {},
  preferences: { availableHours: 4, bufferMinutes: 30 },
};
