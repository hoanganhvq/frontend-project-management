import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getSettingsPreferences } from './settingsPreferences'
import { settingsResources } from './settingsTranslations'
import { appResources } from './appTranslations'

const resources = {
  en: { ...settingsResources.en, ...appResources.en },
  vi: { ...settingsResources.vi, ...appResources.vi },
  ja: { ...settingsResources.ja, ...appResources.ja },
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getSettingsPreferences().language,
  fallbackLng: 'en',
  defaultNS: 'settings',
  ns: ['settings', 'app'],
  keySeparator: false,
  interpolation: { escapeValue: false },
})

export default i18n
