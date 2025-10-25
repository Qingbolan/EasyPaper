import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { RBSidebarProvider, RBSidebar } from '@/components/reactbits/sidebar'
import { I18nProvider } from '@/lib/i18n'
import { AccentColorProvider } from '@/lib/accent-color'
import { ThemeProvider } from '@/lib/theme-context'
import { FluentProviderWrapper } from '@/components/providers/fluent-provider'
import { AntdProvider } from '@/components/providers/antd-provider'

// Pages
import WelcomePage from '@/pages/WelcomePage'
import EditorPage from '@/pages/EditorPage'
import SettingsPage from '@/pages/SettingsPage'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans antialiased h-dvh overflow-hidden">
      <ThemeProvider>
        <AntdProvider>
          <FluentProviderWrapper>
            <AccentColorProvider>
              <I18nProvider>
                <RBSidebarProvider>
                  {/* Sidebar - ReactBits style */}
                  <RBSidebar>
                    <AppSidebar />
                  </RBSidebar>

                  {/* Main content: independent scroll container with CSS var offset */}
                  <main
                    className="h-dvh overflow-y-auto overscroll-y-contain relative"
                    style={{ marginLeft: 'var(--rb-sidebar-width)' }}
                  >
                    {/* Acrylic Background Layer */}
                    <div
                      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
                      style={{ left: 'var(--rb-sidebar-width)' }}
                    >
                      {/* Base gradient with colorful orbs */}
                      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />

                      {/* Floating orbs - provide content for backdrop-filter effect */}
                      <div className="absolute top-20 right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                      <div className="absolute bottom-32 left-20 h-80 w-80 rounded-full bg-accent/12 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                      <div className="absolute top-1/2 right-1/4 h-72 w-72 rounded-full bg-success/10 blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                      <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-warning/8 blur-3xl animate-pulse" style={{ animationDuration: '15s', animationDelay: '6s' }} />

                      {/* Mesh gradient overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
                    </div>

                    {/* Acrylic Layer with backdrop-filter effect */}
                    <div
                      className="fixed inset-0 pointer-events-none z-[1]"
                      style={{
                        left: 'var(--rb-sidebar-width)',
                        backgroundColor: 'rgba(var(--acrylic-tint), 0.7)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                      }}
                    >
                      {/* Noise texture */}
                      <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                          backgroundSize: '200px 200px',
                          mixBlendMode: 'soft-light',
                        }}
                      />
                    </div>

                    {/* Main content area - above acrylic layer */}
                    <div className="relative z-10 h-dvh flex flex-col">
                      <div className="flex-1 min-h-0">
                        {children}
                      </div>
                    </div>
                  </main>
                </RBSidebarProvider>
              </I18nProvider>
            </AccentColorProvider>
          </FluentProviderWrapper>
        </AntdProvider>
      </ThemeProvider>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/project/:papername" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
