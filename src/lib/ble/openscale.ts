/**
 * openScale-compatible BLE parsers.
 * Broadcast-only scales (AAA002 family, OKOK/Chipsea, Xiaomi) put weight in
 * advertisements — no GATT connection. Standard Weight Scale Service (0x181D)
 * is the GATT fallback.
 */

export type ScaleReading = {
  kg: number;
  bodyFatPct?: number;
  impedanceOhm?: number;
  stable: boolean;
  source: string;
  deviceName: string;
  /** Stable per-scan identity for the broadcasting device, when the browser gives us one
   *  (only in the requestLEScan path — the requestDevice chooser fallback has just one device,
   *  so this is left undefined there and callers can key off deviceName instead). */
  deviceId?: string;
  rssi?: number;
};

const WEIGHT_SERVICE = 0x181d;
const BODY_COMP_SERVICE = 0x181b;
const WEIGHT_CHAR = 0x2a9d;

export const OPENSCALE_NAME_PREFIXES = [
  "AAA",
  "ADV",
  "Chipsea",
  "MIBFS",
  "MI_SCALE",
  "MI SCALE",
  "Showee",
  "EL1",
  "QN-Scale",
  "PICOOC",
  "Yunmai",
  "YUNMAI",
];

export function supportsWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function u16be(hi: number, lo: number) {
  return ((hi & 0xff) << 8) | (lo & 0xff);
}
function u16le(lo: number, hi: number) {
  return ((hi & 0xff) << 8) | (lo & 0xff);
}
function byteAt(view: DataView, i: number) {
  return view.getUint8(i);
}

/** AAA-series (AAA002 / AAA007 / AAA013) — XOR cipher on manufacturer payload. */
export function parseAaaBroadcast(companyId: number, data: DataView, name: string): ScaleReading | null {
  if (data.byteLength < 12) return null;
  const xorKey = (companyId >>> 8) & 0xff;
  const payload = new Uint8Array(6);
  for (let p = 0; p < 6; p++) payload[p] = byteAt(data, 6 + p) ^ xorKey;
  let chk = 0;
  for (let p = 0; p < 5; p++) chk += payload[p];
  if ((chk & 0x1f) !== (payload[5] & 0x1f)) return null;
  const type = payload[4];
  if (type !== 0xad) return null;
  const value =
    ((payload[0] & 0xff) << 24) |
    ((payload[1] & 0xff) << 16) |
    ((payload[2] & 0xff) << 8) |
    (payload[3] & 0xff);
  const stable = ((value >>> 31) & 0x1) !== 0;
  const grams = value & 0x3ffff;
  if (grams <= 0) return null;
  return {
    kg: Math.round((grams / 1000) * 10) / 10,
    stable,
    source: "openscale-aaa",
    deviceName: name || "AAA002",
  };
}

/** OKOK / Chipsea V2.0 (manufacturer 0x20CA) — device name often "ADV". */
export function parseOkOkV20(data: DataView, name: string): ScaleReading | null {
  if (data.byteLength < 12) return null;
  const finalFlag = byteAt(data, 6);
  const stable = (finalFlag & 0x01) !== 0;
  const divider = (finalFlag & 0x04) !== 0 ? 100 : 10;
  const raw = u16be(byteAt(data, 8), byteAt(data, 9));
  const kg = raw / divider;
  if (kg < 5 || kg > 300) return null;
  const imp = data.byteLength > 11 ? u16be(byteAt(data, 10), byteAt(data, 11)) / 10 : undefined;
  return {
    kg: Math.round(kg * 10) / 10,
    impedanceOhm: imp,
    stable,
    source: "openscale-okok",
    deviceName: name || "ADV",
  };
}

/** OKOK V1.1 (manufacturer 0x11CA). Weight is big-endian at bytes 4–5 of payload after company id. */
export function parseOkOkV11(data: DataView, name: string): ScaleReading | null {
  if (data.byteLength < 6) return null;
  const raw = u16be(byteAt(data, 4), byteAt(data, 5));
  const kg = raw / 10;
  if (kg < 5 || kg > 300) return null;
  return {
    kg: Math.round(kg * 10) / 10,
    stable: true,
    source: "openscale-okok",
    deviceName: name || "Chipsea-BLE",
  };
}

/** Xiaomi Mi Scale v1 — service 0x181D. */
export function parseMiScaleV1(data: DataView, name: string): ScaleReading | null {
  if (data.byteLength < 10) return null;
  const ctrl = byteAt(data, 0);
  const stable = (ctrl & 0x20) !== 0;
  const isJin = (ctrl & 0x01) !== 0;
  const isLb = (ctrl & 0x02) !== 0;
  let raw = u16le(byteAt(data, 1), byteAt(data, 2));
  let kg = raw / 200;
  if (isJin) kg = raw / 100 / 2;
  if (isLb) kg = (raw / 100) * 0.453592;
  if (kg < 5 || kg > 300) return null;
  return {
    kg: Math.round(kg * 10) / 10,
    stable,
    source: "openscale-miscale",
    deviceName: name || "MI_SCALE",
  };
}

/** Xiaomi Mi Scale v2 / MIBFS — service 0x181B. */
export function parseMiScaleV2(data: DataView, name: string): ScaleReading | null {
  if (data.byteLength < 13) return null;
  const ctrl = byteAt(data, 1);
  const stable = (ctrl & 0x20) !== 0;
  const isJin = (ctrl & 0x01) !== 0;
  let raw = u16le(byteAt(data, 11), byteAt(data, 12));
  let kg = raw / 200;
  if (isJin) kg = raw / 100 / 2;
  if (kg < 5 || kg > 300) return null;
  const impedance = u16le(byteAt(data, 9), byteAt(data, 10));
  return {
    kg: Math.round(kg * 10) / 10,
    impedanceOhm: impedance || undefined,
    stable,
    source: "openscale-miscale",
    deviceName: name || "MIBFS",
  };
}

/** Bluetooth SIG Weight Scale Measurement characteristic 0x2A9D. */
export function parseGattWeight(data: DataView | null | undefined): number | null {
  if (!data || data.byteLength < 3) return null;
  const flags = data.getUint8(0);
  const imperial = (flags & 0x01) !== 0;
  const raw = data.getUint16(1, true);
  const kg = imperial ? raw * 0.00453592 : raw * 0.005;
  if (kg < 5 || kg > 300) return null;
  return Math.round(kg * 10) / 10;
}

/**
 * OKOK/Chipsea "Nameless" family — the low byte of the manufacturer-data
 * company id is a fixed 0xC0 marker but (unlike the 0x20CA/0x11CA variants
 * above) the high byte is *not* fixed — it varies packet to packet on real
 * hardware, so it has to be matched on the low byte alone. This is the exact
 * variant openScale's own UI labels "OKOK C0", reverse-engineered against
 * real capture logs (github.com/oliexdev/openScale/issues/950): weight is
 * big-endian at payload bytes 0–1, in units of 0.01 kg, and bytes 8–13 are
 * the scale's own MAC address.
 */
export function parseOkOkC0(companyId: number, data: DataView, name: string): ScaleReading | null {
  if ((companyId & 0xff) !== 0xc0) return null;
  if (data.byteLength < 2) return null;
  const raw = u16be(byteAt(data, 0), byteAt(data, 1));
  const kg = raw / 100;
  if (kg < 5 || kg > 300) return null;
  return {
    kg: Math.round(kg * 100) / 100,
    stable: true,
    source: "openscale-okok-c0",
    deviceName: name || "Nameless",
  };
}

type AdvertisementLike = {
  device?: { name?: string | null; id?: string };
  name?: string | null;
  manufacturerData?: Map<number, DataView>;
  serviceData?: Map<string, DataView>;
  rssi?: number;
};

function shortUuid(uuid: string) {
  const m = uuid.toLowerCase().match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  return m ? m[1] : uuid.toLowerCase();
}

/** Device identity + signal strength alone — extracted for every advertisement seen,
 *  whether or not it decodes as a known scale protocol, so a "found devices" list can
 *  show what's nearby before (or without) a successful decode. */
export type SeenDevice = {
  deviceId?: string;
  name: string;
  rssi?: number;
};

export function describeAdvertisement(ev: AdvertisementLike): SeenDevice {
  return {
    deviceId: ev.device?.id,
    name: (ev.name || ev.device?.name || "").trim(),
    rssi: ev.rssi,
  };
}

export function parseAdvertisement(ev: AdvertisementLike): ScaleReading | null {
  const name = (ev.name || ev.device?.name || "").trim();
  const deviceId = ev.device?.id;
  const rssi = ev.rssi;
  const withId = (r: ScaleReading | null) => (r ? { ...r, deviceId, rssi } : r);
  const manuf = ev.manufacturerData;
  if (manuf) {
    for (const [companyId, payload] of manuf) {
      if (companyId === 0x20ca) {
        const r = parseOkOkV20(payload, name);
        if (r) return withId(r);
      }
      if (companyId === 0x11ca) {
        const r = parseOkOkV11(payload, name);
        if (r) return withId(r);
      }
      const c0 = parseOkOkC0(companyId, payload, name);
      if (c0) return withId(c0);
      if (/^AAA\d*/i.test(name) || name === "") {
        const r = parseAaaBroadcast(companyId, payload, name || "AAA002");
        if (r) return withId(r);
      }
    }
  }
  const services = ev.serviceData;
  if (services) {
    for (const [uuid, payload] of services) {
      const short = shortUuid(uuid);
      if (short === "181d") {
        const r = parseMiScaleV1(payload, name);
        if (r) return withId(r);
      }
      if (short === "181b") {
        const r = parseMiScaleV2(payload, name);
        if (r) return withId(r);
      }
    }
  }
  return null;
}

type BtNav = Navigator & {
  bluetooth: {
    requestDevice: (opts: unknown) => Promise<BtDevice>;
    requestLEScan?: (opts: unknown) => Promise<{ stop: () => void }>;
    addEventListener: (type: string, fn: (ev: Event) => void) => void;
    removeEventListener: (type: string, fn: (ev: Event) => void) => void;
  };
};

type BtDevice = {
  name?: string;
  gatt?: {
    connected?: boolean;
    connect: () => Promise<{
      getPrimaryService: (s: number) => Promise<{
        getCharacteristic: (c: number) => Promise<BtChar>;
      }>;
    }>;
    disconnect?: () => void;
  };
  watchAdvertisements?: () => Promise<void>;
  addEventListener: (type: string, fn: (ev: Event) => void) => void;
  removeEventListener?: (type: string, fn: (ev: Event) => void) => void;
};

type BtChar = EventTarget & {
  value?: DataView;
  startNotifications: () => Promise<unknown>;
};

export type ScanHandle = { stop: () => void };

/** Listen to BLE advertisements from an openScale broadcast scale (no GATT).
 *  `onEvent` fires for every advertisement seen — `reading` is null until that
 *  device's packet actually decodes as a known scale protocol — so callers can
 *  show a "found devices" list and only offer to use the ones that decoded. */
export async function listenBroadcast(
  onEvent: (seen: SeenDevice, reading: ScaleReading | null) => void,
): Promise<ScanHandle> {
  const bt = (navigator as BtNav).bluetooth;
  if (!bt) throw new Error("Web Bluetooth is not available. Use Chrome on Android.");

  const onAdv = (ev: Event) => {
    const advertisement = ev as unknown as AdvertisementLike;
    onEvent(describeAdvertisement(advertisement), parseAdvertisement(advertisement));
  };

  if (typeof bt.requestLEScan === "function") {
    const scan = await bt.requestLEScan({ acceptAllAdvertisements: true });
    bt.addEventListener("advertisementreceived", onAdv);
    return {
      stop: () => {
        try {
          scan.stop();
        } catch {
          /* already stopped */
        }
        bt.removeEventListener("advertisementreceived", onAdv);
      },
    };
  }

  const device = await bt.requestDevice({
    filters: OPENSCALE_NAME_PREFIXES.map((p) => ({ namePrefix: p })),
    optionalServices: [WEIGHT_SERVICE, BODY_COMP_SERVICE],
  });
  if (typeof device.watchAdvertisements !== "function") {
    throw new Error("This browser cannot watch BLE advertisements. Try Chrome on Android.");
  }
  device.addEventListener("advertisementreceived", onAdv);
  await device.watchAdvertisements();
  return {
    stop: () => {
      device.removeEventListener?.("advertisementreceived", onAdv);
    },
  };
}

/** GATT connect for scales that expose the standard Weight Scale service. */
export async function connectGatt(onReading: (r: ScaleReading) => void): Promise<ScanHandle> {
  const bt = (navigator as BtNav).bluetooth;
  if (!bt) throw new Error("Web Bluetooth is not available. Use Chrome on Android.");
  const device = await bt.requestDevice({
    filters: [{ services: [WEIGHT_SERVICE] }],
    optionalServices: [WEIGHT_SERVICE, BODY_COMP_SERVICE],
  });
  const server = await device.gatt?.connect();
  const service = await server?.getPrimaryService(WEIGHT_SERVICE);
  const char = await service?.getCharacteristic(WEIGHT_CHAR);
  await char?.startNotifications();
  const handler = (ev: Event) => {
    const target = ev.target as BtChar;
    const kg = parseGattWeight(target.value);
    if (kg != null) {
      onReading({
        kg,
        stable: true,
        source: "gatt-weight-scale",
        deviceName: device.name || "BLE scale",
      });
    }
  };
  char?.addEventListener("characteristicvaluechanged", handler);
  return {
    stop: () => {
      try {
        device.gatt?.disconnect?.();
      } catch {
        /* ignore */
      }
    },
  };
}
