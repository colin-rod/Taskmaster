import { describe, it, expect } from 'vitest';
import { isTaskVisibleTo, isUuid, visibilityFilter, visibleTo } from './task-visibility.js';

const ME = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';

describe('isTaskVisibleTo', () => {
  it('shows a private task to its owner', () => {
    expect(isTaskVisibleTo({ owner_id: ME, assigned_to_user_id: null, is_shared: false }, ME)).toBe(true);
  });

  it('hides a private task from everyone else', () => {
    expect(isTaskVisibleTo({ owner_id: PARTNER, assigned_to_user_id: null, is_shared: false }, ME)).toBe(false);
  });

  it('shows a private task to its assignee', () => {
    expect(isTaskVisibleTo({ owner_id: PARTNER, assigned_to_user_id: ME, is_shared: false }, ME)).toBe(true);
  });

  it('shows a shared task to a profile that neither owns nor is assigned to it', () => {
    expect(isTaskVisibleTo({ owner_id: PARTNER, assigned_to_user_id: PARTNER, is_shared: true }, ME)).toBe(true);
  });
});

describe('visibilityFilter', () => {
  it('builds the owner / assignee / shared filter', () => {
    expect(visibilityFilter(ME)).toBe(
      `owner_id.eq.${ME},assigned_to_user_id.eq.${ME},is_shared.eq.true`
    );
  });

  it('rejects anything that is not a UUID, since the id is interpolated into the filter', () => {
    expect(() => visibilityFilter(`${ME},is_shared.eq.false`)).toThrow();
    expect(() => visibilityFilter('')).toThrow();
  });
});

describe('visibleTo', () => {
  it('applies the filter to the query and returns it for chaining', () => {
    const calls: string[] = [];
    const query = {
      or(filters: string) {
        calls.push(filters);
        return this;
      },
    };

    expect(visibleTo(query, ME)).toBe(query);
    expect(calls).toEqual([visibilityFilter(ME)]);
  });
});

describe('isUuid', () => {
  it('accepts UUIDs and rejects other values', () => {
    expect(isUuid(ME)).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
