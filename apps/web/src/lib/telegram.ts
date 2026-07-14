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

  const theme = webApp.themeParams ?? {};
  const root = document.documentElement;
  setCssVar(root, "--tg-bg", theme.bg_color);
  setCssVar(root, "--tg-surface", theme.secondary_bg_color);
  setCssVar(root, "--tg-text", theme.text_color);
  setCssVar(root, "--tg-hint", theme.hint_color);
  setCssVar(root, "--tg-link", theme.link_color);
  setCssVar(root, "--tg-button", theme.button_color);
  setCssVar(root, "--tg-button-text", theme.button_text_color);
}

function setCssVar(root: HTMLElement, name: string, value?: string) {
  if (value) {
    root.style.setProperty(name, value);
  }
}
