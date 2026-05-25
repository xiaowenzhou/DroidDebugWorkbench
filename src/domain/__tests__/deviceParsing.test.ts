import { describe, expect, it } from 'vitest';
import { parseAdbDevices, parseFastbootDevices } from '../deviceParsing';

describe('device parsing', () => {
  it('parses adb devices -l output into stable device references', () => {
    const devices = parseAdbDevices(`List of devices attached
R58T1234	device product:husky model:Pixel_8_Pro device:husky transport_id:7
192.168.1.20:5555	offline product:oriole model:Pixel_6 device:oriole
ABC999	unauthorized
`);

    expect(devices).toMatchObject([
      {
        serial: 'R58T1234',
        transport: 'adb-usb',
        state: 'device',
        model: 'Pixel 8 Pro',
        capabilities: expect.arrayContaining(['adb', 'logcat', 'bugreport', 'screenshot', 'screenrecord']),
      },
      {
        serial: '192.168.1.20:5555',
        transport: 'adb-wifi',
        state: 'offline',
        model: 'Pixel 6',
      },
      {
        serial: 'ABC999',
        state: 'unauthorized',
        capabilities: ['adb'],
      },
    ]);
  });

  it('parses fastboot devices output', () => {
    expect(parseFastbootDevices('R58T1234\tfastboot\n')).toMatchObject([
      {
        id: 'fastboot-R58T1234',
        serial: 'R58T1234',
        transport: 'fastboot',
        state: 'fastboot',
        capabilities: ['fastboot'],
      },
    ]);
  });
});
