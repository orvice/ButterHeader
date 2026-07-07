import { describe, expect, it } from 'vitest';
import { compileRules, type Config } from './compile';

describe('compileRules', () => {
  it('compiles an enabled profile with one set-request-header rule into one DNR rule that applies to all sites', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: [],
          rules: [
            {
              id: 'r1',
              enabled: true,
              target: 'request',
              operation: 'set',
              name: 'X-Debug-Mode',
              value: 'on',
            },
          ],
        },
      ],
    };

    expect(compileRules(config)).toEqual([
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'X-Debug-Mode', operation: 'set', value: 'on' },
          ],
        },
        condition: {
          urlFilter: '*',
          resourceTypes: [
            'main_frame',
            'sub_frame',
            'stylesheet',
            'script',
            'image',
            'font',
            'object',
            'xmlhttprequest',
            'ping',
            'csp_report',
            'media',
            'websocket',
            'webtransport',
            'webbundle',
            'other',
          ],
        },
      },
    ]);
  });

  it('produces no rules for a paused profile', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: false,
          domains: [],
          rules: [
            {
              id: 'r1',
              enabled: true,
              target: 'request',
              operation: 'set',
              name: 'X-Debug-Mode',
              value: 'on',
            },
          ],
        },
      ],
    };

    expect(compileRules(config)).toEqual([]);
  });

  it('compiles an empty config into an empty rule set', () => {
    expect(compileRules({ globalPause: false, profiles: [] })).toEqual([]);
  });
});
