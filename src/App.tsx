import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppSidebar } from './app/components/AppSidebar';
import { AppTopbar } from './app/components/AppTopbar';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { UploadScreen } from './features/upload/UploadScreen';
import { EditorScreen } from './features/editor/EditorScreen';
import { CoverStudioScreen } from './features/cover/CoverStudioScreen';
import { PreviewScreen } from './features/preview/PreviewScreen';
import { StrategyScreen } from './features/strategy/StrategyScreen';
import type { AppScreen, ThemeMode } from './app/types';

const SCREEN_COMPONENTS: Record<AppScreen, ComponentType> = {
  dashboard: DashboardScreen,
  upload: UploadScreen,
  editor: EditorScreen,
  cover: CoverStudioScreen,
  preview: PreviewScreen,
  strategy: StrategyScreen,
};

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('dashboard');
  const [theme, setTheme] = useState<ThemeMode>('light');

  const CurrentScreen = useMemo(() => SCREEN_COMPONENTS[screen], [screen]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-app text-ink">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(12,176,165,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,111,78,0.12),_transparent_24%),linear-gradient(180deg,_#fffdf8_0%,_#f6f4ee_100%)]" />
        <AppSidebar currentScreen={screen} onScreenChange={setScreen} />
        <AppTopbar theme={theme} onThemeChange={setTheme} />

        <main className="min-h-screen pl-72 pr-6 pt-24 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
            >
              <CurrentScreen />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
