import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/themeStore'
import { useUserStore } from '@/store/userStore'
import { useEffect } from 'react'

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useThemeStore()
  const { updateSettings } = useUserStore()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const handleToggle = async () => {
    toggleTheme()
    // Sync with database
    const newTheme = theme === 'light' ? 'dark' : 'light'
    await updateSettings({ theme: newTheme })
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle} className="rounded-full">
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  )
}
