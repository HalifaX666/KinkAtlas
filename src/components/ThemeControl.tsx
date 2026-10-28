import { Palette } from 'lucide-react'
import { themePreferences, useTheme, type ThemePreference } from '../theme/ThemeContext'

const labels: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export function ThemeControl() {
  const { preference, setPreference } = useTheme()

  return <label className="theme-control">
    <Palette size={16} aria-hidden="true" />
    <span>Theme</span>
    <select aria-label="Theme preference" value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)}>
      {themePreferences.map((option) => <option value={option} key={option}>{labels[option]}</option>)}
    </select>
  </label>
}
