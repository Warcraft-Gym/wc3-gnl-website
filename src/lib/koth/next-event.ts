import * as impl from "./next-event.mjs";

/**
 * Typed façade over the pure plain-JS implementation, so `node --test` can run
 * the tests with no loader while the components get types. Same split as
 * `filter.ts`/`filter.mjs`.
 */

export type EventZoneTime = { label: string; time: string };
export type NextEvent = { day: string; times: EventZoneTime[] };
export type ZoneReading = { day: string; time: string; zone: string };

export const formatNextEvent = impl.formatNextEvent as (iso: string) => NextEvent | null;
export const isPast = impl.isPast as (iso: string, now?: Date) => boolean;
export const formatInZone = impl.formatInZone as (iso: string, timeZone: string) => ZoneReading | null;
export const LISTED_ZONES = impl.LISTED_ZONES as string[];
