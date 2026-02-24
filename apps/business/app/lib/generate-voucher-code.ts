import voucherify from "voucher-code-generator";

export function generateVoucherCode(): string {
  const year = new Date().getFullYear();
  const code = voucherify.generate({
    length: 10,
    count: 1,
    prefix: "areacodes-",
    postfix: `-${year}`,
  });
  return code[0];
}
