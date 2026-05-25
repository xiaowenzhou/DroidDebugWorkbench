import type { DeviceRef, DeviceState, DeviceTransport } from './types';

export function parseAdbDevices(output: string, timestamp = new Date().toISOString()): DeviceRef[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('List of devices'))
    .map((line) => parseAdbDeviceLine(line, timestamp));
}

export function parseFastbootDevices(output: string, timestamp = new Date().toISOString()): DeviceRef[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial] = line.split(/\s+/);
      return {
        id: `fastboot-${serial}`,
        serial,
        transport: 'fastboot',
        state: 'fastboot',
        capabilities: ['fastboot'],
        lastSeenAt: timestamp,
      };
    });
}

function parseAdbDeviceLine(line: string, timestamp: string): DeviceRef {
  const [serial, stateToken, ...details] = line.split(/\s+/);
  const state = normalizeAdbState(stateToken);
  const detailMap = parseDetails(details);
  const transport = inferAdbTransport(serial);
  const capabilities = state === 'device' ? ['adb', 'logcat', 'bugreport', 'dumpsys', 'screenshot'] : ['adb'];

  return {
    id: `${transport}-${serial}`,
    serial,
    transport,
    state,
    model: detailMap.model ? humanizeAdbValue(detailMap.model) : undefined,
    manufacturer: detailMap.product ? humanizeAdbValue(detailMap.product) : undefined,
    capabilities,
    lastSeenAt: timestamp,
  };
}

function parseDetails(details: string[]): Record<string, string> {
  return Object.fromEntries(
    details
      .map((detail) => detail.split(':'))
      .filter((parts): parts is [string, string] => parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1])),
  );
}

function normalizeAdbState(state: string | undefined): DeviceState {
  if (state === 'device' || state === 'offline' || state === 'unauthorized' || state === 'recovery' || state === 'sideload') {
    return state;
  }
  return 'disconnected';
}

function inferAdbTransport(serial: string): DeviceTransport {
  return /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(serial) ? 'adb-wifi' : 'adb-usb';
}

function humanizeAdbValue(value: string): string {
  return value.replace(/_/g, ' ');
}
