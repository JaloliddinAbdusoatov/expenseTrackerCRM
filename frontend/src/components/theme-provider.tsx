import * as React from "react"

/**
 * Упрощенный ThemeProvider - всегда использует темную тему
 * Переключение темы отключено, всегда применяется класс 'dark'
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Всегда применяем темную тему
    const root = document.documentElement
    root.classList.add("dark")
    root.classList.remove("light")
    
    // Удаляем сохраненное значение темы из localStorage, чтобы всегда был dark
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('theme')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  return <>{children}</>
}
