"use client"
import { createContext, useContext, useEffect, useState } from "react"
import { SessionProvider } from "next-auth/react"
import { ConfigProvider, App, theme as antdTheme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"

type Mode = "light" | "dark"

const ThemeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: "light",
  toggle: () => {},
})

export function useThemeMode() {
  return useContext(ThemeContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light")

  useEffect(() => {
    const stored = localStorage.getItem("theme-mode") as Mode | null
    if (stored === "light" || stored === "dark") setMode(stored)
  }, [])

  function toggle() {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("theme-mode", next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <SessionProvider>
        <StyleProvider layer>
          <ConfigProvider
            theme={{
              algorithm: mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
              token: { colorPrimary: "#4f46e5" },
            }}
          >
            <App>{children}</App>
          </ConfigProvider>
        </StyleProvider>
      </SessionProvider>
    </ThemeContext.Provider>
  )
}
