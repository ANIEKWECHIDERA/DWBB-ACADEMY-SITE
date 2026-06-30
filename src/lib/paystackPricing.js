const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT_FEE_KOBO = 10000;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD_KOBO = 250000;
const PAYSTACK_FEE_CAP_KOBO = 200000;

export function calculatePaystackFeeKobo(grossAmountKobo) {
  let feeKobo = Math.ceil(grossAmountKobo * PAYSTACK_RATE);

  if (grossAmountKobo >= PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD_KOBO) {
    feeKobo += PAYSTACK_FLAT_FEE_KOBO;
  }

  return Math.min(feeKobo, PAYSTACK_FEE_CAP_KOBO);
}

export function calculateGrossAmountForTargetNetKobo(targetNetKobo) {
  let low = targetNetKobo;
  let high = targetNetKobo + Math.max(PAYSTACK_FEE_CAP_KOBO, Math.ceil(targetNetKobo * PAYSTACK_RATE) + PAYSTACK_FLAT_FEE_KOBO) + 1000;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const netAfterFees = mid - calculatePaystackFeeKobo(mid);

    if (netAfterFees >= targetNetKobo) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

export function getCheckoutPricing(baseAmountNaira) {
  const baseAmountKobo = Math.round(baseAmountNaira * 100);
  const totalChargeKobo = calculateGrossAmountForTargetNetKobo(baseAmountKobo);
  const processingFeeKobo = totalChargeKobo - baseAmountKobo;

  return {
    baseAmountNaira,
    baseAmountKobo,
    processingFeeNaira: processingFeeKobo / 100,
    processingFeeKobo,
    totalChargeNaira: totalChargeKobo / 100,
    totalChargeKobo,
  };
}
