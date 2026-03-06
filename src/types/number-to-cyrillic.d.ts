declare module "number-to-cyrillic" {
  export function convert(
    value: number,
    options?: { language?: string; currency?: string }
  ): {
    convertedInteger?: string;
    integerCurrency?: string;
    convertedFractional?: string;
    fractionalCurrency?: string;
    integer: number;
    fractional: number;
    fractionalString: string;
    shortName?: string;
  };
}
