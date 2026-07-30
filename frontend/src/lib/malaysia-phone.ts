export function normalizeMalaysiaPhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("60")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length < 8 || digits.length > 10) {
    throw new Error("Enter a valid Malaysian contact number.");
  }

  return `+60${digits}`;
}
