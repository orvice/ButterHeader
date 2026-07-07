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

  it('compiles a remove-request-header rule into a DNR remove operation without a value', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: [],
          rules: [
            { id: 'r1', enabled: true, target: 'request', operation: 'remove', name: 'Referer' },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.action.requestHeaders).toEqual([{ header: 'Referer', operation: 'remove' }]);
    expect(rule.action.responseHeaders).toBeUndefined();
  });

  it('compiles a set-response-header rule into DNR responseHeaders, leaving requestHeaders unset', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'CORS',
          enabled: true,
          domains: [],
          rules: [
            {
              id: 'r1',
              enabled: true,
              target: 'response',
              operation: 'set',
              name: 'Access-Control-Allow-Origin',
              value: '*',
            },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.action.responseHeaders).toEqual([
      { header: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
    ]);
    expect(rule.action.requestHeaders).toBeUndefined();
  });

  it('compiles a remove-response-header rule into a DNR responseHeaders remove operation', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'CSP off',
          enabled: true,
          domains: [],
          rules: [
            {
              id: 'r1',
              enabled: true,
              target: 'response',
              operation: 'remove',
              name: 'Content-Security-Policy',
            },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.action.responseHeaders).toEqual([
      { header: 'Content-Security-Policy', operation: 'remove' },
    ]);
  });

  it('skips disabled rules but keeps enabled rules in the same profile', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: [],
          rules: [
            { id: 'r1', enabled: false, target: 'request', operation: 'set', name: 'X-Off', value: '1' },
            { id: 'r2', enabled: true, target: 'request', operation: 'set', name: 'X-On', value: '1' },
          ],
        },
      ],
    };

    const compiled = compileRules(config);
    expect(compiled).toHaveLength(1);
    expect(compiled[0].action.requestHeaders).toEqual([
      { header: 'X-On', operation: 'set', value: '1' },
    ]);
  });

  it('compiles an empty config into an empty rule set', () => {
    expect(compileRules({ globalPause: false, profiles: [] })).toEqual([]);
  });
});
