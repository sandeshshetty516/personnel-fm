import { useColorScheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Chart colours by role, for light and dark. These are the validated reference palette's steps
 * (dataviz skill `references/palette.md`): income/expense are categorical slots 1–2 (blue, orange),
 * which pass every CVD, normal-vision and contrast check in both modes. Green/red are deliberately
 * not used for income/expense: those hues are reserved for status. Dark values are selected for the
 * dark surface, not an automatic inversion.
 */
const TOKENS = {
  light: {
    surface: '#fcfcfb',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    textMuted: '#898781',
    income: '#2a78d6',
    expense: '#eb6834',
    /** Single-hue series (savings trend, ranked category bars). */
    accent: '#2a78d6',
    accentWash: 'rgba(42, 120, 214, 0.10)',
    /** Unfilled track behind ranked bars: a lighter step of the same ramp. */
    track: '#cde2fb',
    negative: '#d03b3b',
  },
  dark: {
    surface: '#1a1a19',
    grid: '#2c2c2a',
    axis: '#383835',
    textPrimary: '#f0efec',
    textSecondary: '#c3c2b7',
    textMuted: '#898781',
    income: '#3987e5',
    expense: '#d95926',
    accent: '#3987e5',
    accentWash: 'rgba(57, 135, 229, 0.10)',
    track: '#184f95',
    negative: '#d03b3b',
  },
} as const;

export type ChartTokens = (typeof TOKENS)[keyof typeof TOKENS];

/**
 * Reserved status colours (the same in both modes). Never used for series identity, and always shown
 * with an icon and a text label: warning and serious sit below 3:1 on the light surface by design.
 */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export function useChartTokens(): ChartTokens {
  const { mode, systemMode } = useColorScheme();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = mode === 'system' || !mode ? (systemMode ?? (prefersDark ? 'dark' : 'light')) : mode;
  return TOKENS[resolved === 'dark' ? 'dark' : 'light'];
}
