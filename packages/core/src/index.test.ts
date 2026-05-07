import { describe, expect, it } from 'vitest';
import { STATUS, VERSION } from './index.js';

describe('@cha0s-ai/core smoke test', () => {
  it('exports a version string', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('declares an alpha status during early development', () => {
    expect(STATUS).toBe('alpha');
  });
});
