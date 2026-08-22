const assert = require('assert/strict');
const test = require('node:test');

const { calculateAge, isAgeOver18 } = require('../src/utils/age');

const currentDate = new Date('2026-08-22T12:00:00.000Z');

test('a clearly over-18 DOB is ageOver18', () => {
  assert.equal(isAgeOver18('2000-04-15', currentDate), true);
});

test('a clearly under-18 DOB is not ageOver18', () => {
  assert.equal(isAgeOver18('2012-04-15', currentDate), false);
});

test('a person exactly 18 is ageOver18', () => {
  assert.equal(isAgeOver18('2008-08-22', currentDate), true);
});

test('age calculation returns false before the eighteenth birthday', () => {
  assert.equal(isAgeOver18('2008-08-23', currentDate), false);
});

test('age calculation returns true after the eighteenth birthday', () => {
  assert.equal(isAgeOver18('2008-08-21', currentDate), true);
});

test('age calculation correctly handles leap-day birthdays', () => {
  assert.equal(calculateAge('2008-02-29', currentDate), 18);
});
