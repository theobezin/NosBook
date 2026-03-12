import { createContext, useContext, useState } from 'react'
import en from './en'
import fr from './fr'
import de from './de'

const LANGS = { en, fr, de }

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('nosbook-lang') || 'en'
  )

  const t = (key, vars) => {
    const parts = key.split('.')
    let val = LANGS[lang]
    for (const k of parts) val = val?.[k]
    if (typeof val === 'string' && vars) {
      return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
    }
    return val ?? key
  }

  const setLang = (l) => {
    setLangState(l)
    localStorage.setItem('nosbook-lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
