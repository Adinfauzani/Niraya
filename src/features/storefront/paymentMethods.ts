export type PaymentMethodId = "qris" | "transfer";

export type PaymentInstructions = {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  instructions?: string | null;
  qrisImageUrl?: string | null;
};

export type PaymentMethodOption = {
  id: PaymentMethodId;
  label: string;
  hint: string;
};

/**
 * Build the selectable payment-method labels from the configured instructions.
 * Storefront checkout uses a single backend method ("manual_transfer"); these
 * options only control which instructions are shown (QRIS image vs. transfer /
 * e-wallet account), following whatever the business has actually configured.
 */
export function buildPaymentMethods(
  instr?: PaymentInstructions | null,
): PaymentMethodOption[] {
  const out: PaymentMethodOption[] = [];
  if (instr?.qrisImageUrl) {
    out.push({ id: "qris", label: "QRIS", hint: "Pindai kode QR" });
  }
  if (instr?.bankName || instr?.accountNumber) {
    out.push({
      id: "transfer",
      label: instr?.bankName || "Transfer / E-Wallet",
      hint: "Transfer ke rekening tujuan",
    });
  }
  return out;
}