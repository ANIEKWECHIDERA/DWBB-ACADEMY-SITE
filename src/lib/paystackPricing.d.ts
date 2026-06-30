export interface CheckoutPricing {
  baseAmountNaira: number;
  baseAmountKobo: number;
  processingFeeNaira: number;
  processingFeeKobo: number;
  totalChargeNaira: number;
  totalChargeKobo: number;
}

export function calculatePaystackFeeKobo(grossAmountKobo: number): number;
export function calculateGrossAmountForTargetNetKobo(targetNetKobo: number): number;
export function getCheckoutPricing(baseAmountNaira: number): CheckoutPricing;
