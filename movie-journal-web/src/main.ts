import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

// Windows не має емодзі-прапорців: підключаємо шрифт Twemoji лише з прапорцями (лише якщо браузер їх не підтримує).
// Шрифт лежить у public/fonts, тож зовнішній CDN не потрібен.
polyfillCountryFlagEmojis('Twemoji Country Flags', '/fonts/TwemojiCountryFlags.woff2');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));