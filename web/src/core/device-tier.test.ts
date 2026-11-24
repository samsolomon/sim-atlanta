import { describe, expect, it } from 'vitest';
import { deviceTier, type DeviceFacts } from './device-tier';

const desktop: DeviceFacts = { coarse: false, minScreen: 1080, memoryGB: 8, cores: 12, gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)' };

describe('deviceTier', () => {
  it('starts the Galaxy A16 on low', () => {
    expect(deviceTier({ coarse: true, minScreen: 411, memoryGB: 4, cores: 8, gpu: 'Mali-G57 MC2' }).tier).toBe('low');
  });
  it('keeps desktops and a recent iPad on high', () => {
    expect(deviceTier(desktop).tier).toBe('high');
    expect(deviceTier({ coarse: true, minScreen: 834, memoryGB: null, cores: 8, gpu: 'Apple GPU' }).tier).toBe('high');
  });
  it('drops a large Mali tablet, a software renderer and a 4 GB machine to low', () => {
    expect(deviceTier({ coarse: true, minScreen: 900, memoryGB: 8, cores: 8, gpu: 'ANGLE (ARM, Mali-G68 MC4, OpenGL ES 3.2)' }).tier).toBe('low');
    expect(deviceTier({ ...desktop, gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' }).tier).toBe('low');
    expect(deviceTier({ ...desktop, memoryGB: 4 }).tier).toBe('low');
  });
  it('treats old Adrenos as weak but leaves flagship Adrenos to the other rules', () => {
    expect(deviceTier({ ...desktop, coarse: true, minScreen: 900, gpu: 'Adreno (TM) 619' }).tier).toBe('low');
    expect(deviceTier({ ...desktop, coarse: true, minScreen: 900, gpu: 'Adreno (TM) 740' }).tier).toBe('high');
    expect(deviceTier({ ...desktop, coarse: true, minScreen: 900, gpu: 'Adreno (TM) 650' }).tier).toBe('high');
  });
});
