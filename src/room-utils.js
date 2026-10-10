import { INSTRUMENTS, STEPS, createPattern } from "./sequencer.js";

export const PHASES = ["Lobby", "Live", "Finalized"];
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ROOM_NAME_LIMIT = 31;
export const DEFAULT_FLUSH_MS = 1900;
export const FINAL_EDIT_BUFFER_SECONDS = 4;

export function roomIdFromSearch(search) {
  const params = new URLSearchParams(search);
  const raw = params.get("room") ?? params.get("beat");
  return raw && /^[1-9][0-9]{0,14}$/.test(raw) ? BigInt(raw) : null;
}
export function roomHref(id, href = globalThis.location?.href ?? "http://localhost:5173/") {
  const url = new URL(href);
  url.searchParams.set("room", String(id));
  url.searchParams.delete("beat");
  return url.toString();
}
export function beatHref(id, href = globalThis.location?.href ?? "http://localhost:5173/") {
  const url = new URL(href);
  url.searchParams.set("beat", String(id));
  url.searchParams.delete("room");
  return url.toString();
}
export function shortAddress(value) {
  return value ? value.slice(0, 6) + "…" + value.slice(-4) : "—";
}
export function sameAddress(a,b) { return Boolean(a && b) && a.toLowerCase() === b.toLowerCase(); }
export function encodeCell(instrument, cell) {
  if (!INSTRUMENTS.includes(instrument) || !Array.isArray(cell)) throw new RangeError("Invalid cell");
  if (instrument === "drums") {
    if (cell.some(v => !Number.isInteger(v) || v < 0 || v > 3)) throw new RangeError("Invalid drum");
    return cell.reduce((mask, n) => mask | (1 << n), 0);
  }
  if (cell.length > 1 || cell.some(v => !Number.isInteger(v) || v < 0 || v >= 16))
    throw new RangeError("Invalid melody");
  return cell.length ? cell[0] + 1 : 0;
}
export function decodeCell(instrument, value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > (instrument === "drums" ? 15 : 16))
    throw new RangeError("Invalid chain cell");
  return instrument === "drums" ? [0,1,2,3].filter(bit => n & (1 << bit)) : (n === 0 ? [] : [n - 1]);
}
export function decodePattern(data) {
  if (!Array.isArray(data) || data.length !== 4) throw new Error("Malformed contract pattern");
  const result = createPattern();
  for (let i=0;i<4;i++) {
    if (!Array.isArray(data[i]) || data[i].length !== STEPS) throw new Error("Malformed lane");
    result[INSTRUMENTS[i]] = data[i].map(value => decodeCell(INSTRUMENTS[i],value));
  }
  return result;
}
export function editable(room, wallet, instrument, nowSec) {
  if (!room || room.phase !== "Live" || !wallet || !INSTRUMENTS.includes(instrument)) return false;
  if (!sameAddress(wallet,room.seats[INSTRUMENTS.indexOf(instrument)])) return false;
  return nowSec < room.endsAt - FINAL_EDIT_BUFFER_SECONDS;
}
export function canFlush(room, wallet, instrument, nowSec) {
  return Boolean(room && room.phase === "Live" && sameAddress(wallet,room.seats[INSTRUMENTS.indexOf(instrument)]) && nowSec < room.endsAt);
}
export function applyOverlay(confirmed, queued, inflight) {
  const result = {...confirmed};
  for (const [key, cell] of [...inflight.entries(),...queued.entries()]) {
    const [name,stepValue] = key.split(":");
    const step = Number(stepValue);
    if (!INSTRUMENTS.includes(name) || step < 0 || step >= STEPS) continue;
    if (result[name] === confirmed[name]) result[name] = confirmed[name].map(c => [...c]);
    result[name][step] = [...cell];
  }
  return result;
}
export function makeBatches(entries) {
  const grouped = new Map();
  for (const [key,cell] of entries) {
    const [instrument,s] = key.split(":");
    const step=Number(s);
    if (!INSTRUMENTS.includes(instrument) || !Number.isInteger(step) || step < 0 || step >= STEPS) throw new Error("Invalid queued step");
    const set = grouped.get(instrument) ?? [];
    set.push({ step, value: encodeCell(instrument,cell), cell });
    grouped.set(instrument,set);
  }
  return [...grouped.entries()].map(([instrument,values]) => {
    values.sort((a,b)=>a.step-b.step);
    return { instrument, steps: values.map(x=>x.step), values: values.map(x=>x.value),
      cells: values.map(x=>x.cell) };
  });
}
export function getEligibleSeats(room) {
  return INSTRUMENTS.filter((_,i) => (room.eligibleMask & (1 << i)) !== 0);
}
export function formatCountdown(room, nowSec) {
  if (!room || room.phase === "Lobby") return "Not started";
  if (room.phase === "Finalized") return "Complete";
  return Math.max(0,Math.ceil(room.endsAt-nowSec)) + "s remaining";
}
