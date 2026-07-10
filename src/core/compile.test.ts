import { describe, expect, it } from 'vitest';
import { compileRules, type Config, type Profile } from './compile';

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

  it('compiles an exact domain entry into a condition that matches only that host, not subdomains or other sites', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: ['example.com'],
          rules: [
            { id: 'r1', enabled: true, target: 'request', operation: 'set', name: 'X-A', value: '1' },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.condition.urlFilter).toBeUndefined();
    const regex = new RegExp(rule.condition.regexFilter!);
    expect(regex.test('https://example.com/')).toBe(true);
    expect(regex.test('https://example.com/api/data?x=1')).toBe(true);
    expect(regex.test('http://example.com:8080/')).toBe(true);
    expect(regex.test('https://sub.example.com/')).toBe(false);
    expect(regex.test('https://other.com/')).toBe(false);
    expect(regex.test('https://notexample.com/')).toBe(false);
    expect(regex.test('https://example.com.evil.com/')).toBe(false);
  });

  it('compiles a *.wildcard entry into a condition matching all subdomains but not the apex domain', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: ['*.example.com'],
          rules: [
            { id: 'r1', enabled: true, target: 'request', operation: 'set', name: 'X-A', value: '1' },
          ],
        },
      ],
    };

    const regex = new RegExp(compileRules(config)[0].condition.regexFilter!);
    expect(regex.test('https://api.example.com/')).toBe(true);
    expect(regex.test('https://a.b.example.com/path')).toBe(true);
    expect(regex.test('https://example.com/')).toBe(false);
    expect(regex.test('https://badexample.com/')).toBe(false);
    expect(regex.test('https://api.other.com/')).toBe(false);
  });

  it('compiles a mixed domain list where any entry matching is enough', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: ['example.com', '*.klook.com'],
          rules: [
            { id: 'r1', enabled: true, target: 'request', operation: 'set', name: 'X-A', value: '1' },
          ],
        },
      ],
    };

    const regex = new RegExp(compileRules(config)[0].condition.regexFilter!);
    expect(regex.test('https://example.com/')).toBe(true);
    expect(regex.test('https://www.klook.com/')).toBe(true);
    expect(regex.test('https://klook.com/')).toBe(false);
    expect(regex.test('https://www.example.com/')).toBe(false);
  });

  it('gives a later profile higher DNR priority so its same-name header set wins (override by order)', () => {
    const profile = (id: string, value: string) => ({
      id,
      name: id,
      enabled: true,
      domains: [],
      rules: [
        { id: `${id}-r1`, enabled: true, target: 'request' as const, operation: 'set' as const, name: 'X-Env', value },
      ],
    });
    const config: Config = { globalPause: false, profiles: [profile('first', 'staging'), profile('second', 'prod')] };

    const compiled = compileRules(config);
    expect(compiled).toHaveLength(2);
    const byValue = (v: string) =>
      compiled.find((r) => r.action.requestHeaders![0].value === v)!;
    // DNR：同名 header 由更高 priority 的规则先处理，set 后低优先级不再生效
    expect(byValue('prod').priority).toBeGreaterThan(byValue('staging').priority!);
  });

  it('merges two enabled profiles with different headers into independent rules while skipping a paused profile between them', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'A',
          enabled: true,
          domains: [],
          rules: [{ id: 'r1', enabled: true, target: 'request', operation: 'set', name: 'X-A', value: 'a' }],
        },
        {
          id: 'p2',
          name: 'Paused',
          enabled: false,
          domains: [],
          rules: [{ id: 'r2', enabled: true, target: 'request', operation: 'set', name: 'X-Paused', value: 'x' }],
        },
        {
          id: 'p3',
          name: 'B',
          enabled: true,
          domains: [],
          rules: [{ id: 'r3', enabled: true, target: 'request', operation: 'set', name: 'X-B', value: 'b' }],
        },
      ],
    };

    const compiled = compileRules(config);
    const headers = compiled.map((r) => r.action.requestHeaders![0].header);
    expect(headers).toEqual(['X-A', 'X-B']);
    const [a, b] = compiled;
    expect(b.priority).toBeGreaterThan(a.priority!);
  });

  it('compiles to an empty rule set when globally paused, without requiring profiles to be disabled', () => {
    const config: Config = {
      globalPause: true,
      profiles: [
        {
          id: 'p1',
          name: 'Debug',
          enabled: true,
          domains: [],
          rules: [
            { id: 'r1', enabled: true, target: 'request', operation: 'set', name: 'X-A', value: '1' },
          ],
        },
      ],
    };

    expect(compileRules(config)).toEqual([]);
  });

  it('compiles an enabled redirect rule into a DNR redirect action that swaps host and port, matching the source domain', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Local dev',
          enabled: true,
          domains: [],
          rules: [],
          redirects: [
            { id: 'rd1', enabled: true, source: 'api.example.com', target: 'localhost:3000' },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.action.type).toBe('redirect');
    expect(rule.action.redirect?.transform).toEqual({ host: 'localhost', port: '3000' });
    // 源域名复用 Domain Filter 语义：精确匹配 api.example.com，不命中其它
    const regex = new RegExp(rule.condition.regexFilter!);
    expect(regex.test('https://api.example.com/v1/users')).toBe(true);
    expect(regex.test('https://other.com/')).toBe(false);
  });

  it('compiles a wildcard-source redirect whose target carries a scheme into transform scheme+host+port', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'Local dev',
          enabled: true,
          domains: [],
          rules: [],
          redirects: [
            { id: 'rd1', enabled: true, source: '*.example.com', target: 'http://localhost:8080' },
          ],
        },
      ],
    };

    const [rule] = compileRules(config);
    expect(rule.action.redirect?.transform).toEqual({
      host: 'localhost',
      port: '8080',
      scheme: 'http',
    });
    const regex = new RegExp(rule.condition.regexFilter!);
    expect(regex.test('https://api.example.com/')).toBe(true);
    expect(regex.test('https://example.com/')).toBe(false);
  });

  it('skips redirect rules with an empty or hostless target without throwing', () => {
    const config: Config = {
      globalPause: false,
      profiles: [
        {
          id: 'p1',
          name: 'x',
          enabled: true,
          domains: [],
          rules: [],
          redirects: [
            { id: 'rd1', enabled: true, source: 'a.com', target: '' },
            { id: 'rd2', enabled: true, source: 'b.com', target: 'https://' },
            { id: 'rd3', enabled: true, source: 'c.com', target: 'good.test' },
          ],
        },
      ],
    };

    const compiled = compileRules(config);
    expect(compiled).toHaveLength(1);
    expect(compiled[0].action.redirect?.transform).toEqual({ host: 'good.test' });
  });

  it('produces no redirect rules when globally paused, profile disabled, or the rule is disabled', () => {
    const redirect = { id: 'rd1', enabled: true, source: 'a.com', target: 'localhost:3000' };
    const base = (over: Partial<Profile>): Config => ({
      globalPause: false,
      profiles: [
        { id: 'p1', name: 'x', enabled: true, domains: [], rules: [], redirects: [redirect], ...over },
      ],
    });

    expect(compileRules({ ...base({}), globalPause: true })).toEqual([]);
    expect(compileRules(base({ enabled: false }))).toEqual([]);
    expect(compileRules(base({ redirects: [{ ...redirect, enabled: false }] }))).toEqual([]);
  });

  it('compiles an empty config into an empty rule set', () => {
    expect(compileRules({ globalPause: false, profiles: [] })).toEqual([]);
  });
});
