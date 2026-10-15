export const colors = {
  primary: "#FA2C2C",
  primaryDark: "#E32222",
  primaryLight: "#FFE4E4",
  background: "#FFFFFF",
  surface: "#FFFFFF",
  black: "#111111",
  text: "#171717",
  textSecondary: "#7A7A7A",
  gray50: "#FAFAFA",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#D6D6D6",
  gray400: "#A5A5A5",
  gray500: "#777777",
  border: "#E6E6E6",
  success: "#45B649",
  warning: "#FFB800",
  error: "#FA2C2C",
  white: "#FFFFFF",
} as const;

export type ColorName = keyof typeof colors;

