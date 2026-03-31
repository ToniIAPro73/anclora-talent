export type AppScreen =
  | 'dashboard'
  | 'upload'
  | 'editor'
  | 'cover'
  | 'preview'
  | 'strategy';

export type ThemeMode = 'light' | 'dark';

export interface Initiative {
  title: string;
  status: 'ready' | 'active' | 'next';
  summary: string;
}
