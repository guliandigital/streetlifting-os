import {
  Image,
  useComputedColorScheme,
  type ImageProps,
} from "@mantine/core";

import { BRAND_ASSETS } from "@app/branding";

type BrandLogoVariant = "horizontal" | "symbol" | "vertical";
type BrandLogoScheme = "light" | "dark";

interface BrandLogoProps extends Omit<ImageProps, "src" | "alt"> {
  variant?: BrandLogoVariant;
  scheme?: BrandLogoScheme;
  alt?: string;
}

const LOGO_BY_VARIANT: Record<
  BrandLogoVariant,
  Record<BrandLogoScheme, string>
> = {
  horizontal: {
    light: BRAND_ASSETS.logoHorizontalDark,
    dark: BRAND_ASSETS.logoHorizontalLight,
  },
  symbol: {
    light: BRAND_ASSETS.logoSymbolDark,
    dark: BRAND_ASSETS.logoSymbolLight,
  },
  vertical: {
    light: BRAND_ASSETS.logoVerticalDark,
    dark: BRAND_ASSETS.logoVerticalLight,
  },
};

export function BrandLogo({
  variant = "horizontal",
  scheme,
  alt = "Streetlifting OS",
  fit = "contain",
  ...props
}: BrandLogoProps) {
  const computedScheme = useComputedColorScheme("light");
  const resolvedScheme = scheme ?? computedScheme;

  return (
    <Image
      src={LOGO_BY_VARIANT[variant][resolvedScheme]}
      alt={alt}
      fit={fit}
      {...props}
    />
  );
}
