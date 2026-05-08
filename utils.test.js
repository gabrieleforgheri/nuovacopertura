import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isValidEmail, requiredString } from './utils.js';

describe('isValidEmail', () => {
  test('should return true for valid emails', () => {
    assert.strictEqual(isValidEmail('test@example.com'), true);
    assert.strictEqual(isValidEmail('user.name@domain.co.uk'), true);
    assert.strictEqual(isValidEmail('a@b.cd'), true);
  });

  test('should return true for valid emails with whitespace', () => {
    assert.strictEqual(isValidEmail('  test@example.com  '), true);
  });

  test('should return false for invalid emails', () => {
    assert.strictEqual(isValidEmail('invalid-email'), false);
    assert.strictEqual(isValidEmail('test@'), false);
    assert.strictEqual(isValidEmail('@example.com'), false);
    assert.strictEqual(isValidEmail('test @example.com'), false);
  });

  test('should return false for emails that are too short or too long', () => {
    assert.strictEqual(isValidEmail('a@b.c'), false); // 5 chars
    assert.strictEqual(isValidEmail('a@b.cd'), true); // 6 chars
    assert.strictEqual(isValidEmail('a'.repeat(250) + '@b.c'), true); // 254 chars - exactly limit
    assert.strictEqual(isValidEmail('a'.repeat(251) + '@b.c'), false); // 255 chars - too long
  });

  test('should return false for non-string types', () => {
    assert.strictEqual(isValidEmail(null), false);
    assert.strictEqual(isValidEmail(undefined), false);
    assert.strictEqual(isValidEmail(123), false);
    assert.strictEqual(isValidEmail({}), false);
  });
});

describe('requiredString', () => {
  test('should return trimmed string for valid inputs', () => {
    assert.strictEqual(requiredString('  hello  ', 10), 'hello');
    assert.strictEqual(requiredString('world', 5), 'world');
  });

  test('should return null if string exceeds max length', () => {
    assert.strictEqual(requiredString('too long', 5), null);
  });

  test('should return null for empty or whitespace-only strings', () => {
    assert.strictEqual(requiredString(''), null);
    assert.strictEqual(requiredString('   '), null);
  });

  test('should return null for non-string types', () => {
    assert.strictEqual(requiredString(null), null);
    assert.strictEqual(requiredString(undefined), null);
    assert.strictEqual(requiredString(123), null);
  });
});
