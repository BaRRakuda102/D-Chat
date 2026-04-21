import { useThemeStore } from '../store/themeStore'
import { translations } from './translations'

export const useTranslation = () => {
  const language = useThemeStore((state) => state.language)
  const t = translations[language]
  return { t, language }
}