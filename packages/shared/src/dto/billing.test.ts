import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLineAmount, computeInvoiceTotals } from './billing';

test('line amount = applied × qty, less discount%, plus tax%', () => {
  // 500 × 2 = 1000; −10% = 900; +5% tax = 945
  assert.equal(computeLineAmount({ appliedCharge: 500, qty: 2, discountPct: 10, taxPct: 5 }), 945);
});

test('line amount with no discount/tax is applied × qty', () => {
  assert.equal(computeLineAmount({ appliedCharge: 250, qty: 3, discountPct: 0, taxPct: 0 }), 750);
});

test('invoice totals aggregate subtotal, discount, tax and net', () => {
  const totals = computeInvoiceTotals([
    { name: 'A', appliedCharge: 500, qty: 2, discountPct: 10, taxPct: 5, standardCharge: 500 },
    { name: 'B', appliedCharge: 100, qty: 1, discountPct: 0, taxPct: 0, standardCharge: 100 },
  ]);
  // A: gross 1000, disc 100, tax (900*5%)=45 ; B: gross 100
  assert.equal(totals.subtotal, 1100);
  assert.equal(totals.discount, 100);
  assert.equal(totals.tax, 45);
  assert.equal(totals.netAmount, 1045); // 1100 - 100 + 45
});

test('net equals sum of per-line amounts', () => {
  const items = [
    { name: 'A', appliedCharge: 500, qty: 2, discountPct: 10, taxPct: 5, standardCharge: 500 },
    { name: 'B', appliedCharge: 100, qty: 1, discountPct: 0, taxPct: 0, standardCharge: 100 },
  ];
  const totals = computeInvoiceTotals(items);
  const lineSum = items.reduce((s, it) => s + computeLineAmount(it), 0);
  assert.equal(totals.netAmount, lineSum);
});
