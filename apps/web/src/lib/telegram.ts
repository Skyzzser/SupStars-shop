type TelegramThemeParams = {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
};

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  themeParams?: TelegramThemeParams;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
  MainButton?: {
    text: string;
    show: () => void;
    hide: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData ?? "";
}

export function getTelegramUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function isTelegramEnvironment() {
  return Boolean(getTelegramInitData());
}

export function configureTelegramTheme() {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();
  webApp.setBackgroundColor?.("#0d1117");
  webApp.setHeaderColor?.("#0d1117");

  const theme = webApp.themeParams ?? {};
  const root = document.documentElement;
  setDarkCssVar(root, "--tg-bg", theme.bg_color);
  setDarkCssVar(root, "--tg-surface", theme.secondary_bg_color);
  setLightCssVar(root, "--tg-text", theme.text_color);
  setMutedCssVar(root, "--tg-hint", theme.hint_color);
  setCssVar(root, "--tg-link", theme.link_color);
  setCssVar(root, "--tg-button", theme.button_color);
  setLightCssVar(root, "--tg-button-text", theme.button_text_color);
}

function setCssVar(root: HTMLElement, name: string, value?: string) {
  if (value) {
    root.style.setProperty(name, value);
  }
}

function setDarkCssVar(root: HTMLElement, name: string, value?: string) {
  if (value && isDarkColor(value)) {
    root.style.setProperty(name, value);
  }
}

function setLightCssVar(root: HTMLElement, name: string, value?: string) {
  if (value && !isDarkColor(value)) {
    root.style.setProperty(name, value);
  }
}

function setMutedCssVar(root: HTMLElement, name: string, value?: string) {
  if (value && getLuminance(value) > 0.35) {
    root.style.setProperty(name, value);
  }
}

function isDarkColor(value: string) {
  const luminance = getLuminance(value);
  return luminance >= 0 && luminance < 0.42;
}

function getLuminance(value: string) {
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match?.[1]) {
    return -1;
  }

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}
