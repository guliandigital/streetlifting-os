export function publicAsset(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

export const BRAND_ASSETS = {
  logoHorizontalDark: publicAsset("brand/logo-horizontal-dark.png"),
  logoHorizontalLight: publicAsset("brand/logo-horizontal-light.png"),
  logoVerticalDark: publicAsset("brand/logo-vertical-dark.png"),
  logoVerticalLight: publicAsset("brand/logo-vertical-light.png"),
  logoSymbolDark: publicAsset("brand/logo-symbol-dark.png"),
  logoSymbolLight: publicAsset("brand/logo-symbol-light.png"),
  openGraphWhite: publicAsset("brand/open-graph-white.png"),
  openGraphBlack: publicAsset("brand/open-graph-black.png"),
};
