import { createTheme, type MantineColorsTuple } from "@mantine/core";

/** ISF accent red — used in operator headers, branding, attention CTAs. */
const isfRed: MantineColorsTuple = [
  "#ffe5e8",
  "#ffb8be",
  "#ff8a93",
  "#ff5d68",
  "#ff2f3e",
  "#e6151f",
  "#c8102e", // primary
  "#a50d24",
  "#7d0a1b",
  "#560613",
];

export const theme = createTheme({
  primaryColor: "isfRed",
  primaryShade: 6,
  colors: {
    isfRed,
  },
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  defaultRadius: "sm",
});
