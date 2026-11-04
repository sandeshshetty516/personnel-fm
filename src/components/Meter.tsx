import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import { STATUS_COLORS, useChartTokens } from '../features/dashboard/chartTokens';

export type MeterSeverity = 'normal' | 'good' | 'warning' | 'critical';

const STATUS_ICONS: Record<MeterSeverity, SvgIconComponent> = {
  normal: TrendingFlat,
  good: CheckCircleOutlined,
  warning: WarningAmberOutlined,
  critical: ErrorOutlined,
};

interface MeterProps {
  /** 0–100+; values over 100 fill the bar completely. */
  percent: number;
  severity: MeterSeverity;
  /** Short state label shown with an icon, so the state never relies on colour alone. */
  statusLabel: string;
  /** Accessible description of the value, e.g. "₹9,000 of ₹10,000 used". */
  valueText: string;
  /** Optional pace marker (0–100), e.g. how much of the month has passed. */
  markerPercent?: number;
  markerLabel?: string;
  height?: number;
}

/**
 * A single ratio against a limit (dataviz "meter"). The fill carries severity; the unfilled track
 * is a lighter step of the same colour, so the state reads across the whole bar.
 */
export function Meter({
  percent,
  severity,
  statusLabel,
  valueText,
  markerPercent,
  markerLabel,
  height = 8,
}: MeterProps) {
  const tokens = useChartTokens();
  const fill = severity === 'normal' ? tokens.accent : STATUS_COLORS[severity];
  const Icon = STATUS_ICONS[severity];
  const clamped = Math.max(0, Math.min(percent, 100));

  return (
    <Box>
      <Box
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(percent, 100))}
        aria-valuetext={`${valueText} (${statusLabel})`}
        sx={{
          position: 'relative',
          height,
          borderRadius: `${height / 2}px`,
          // Lighter step of the fill's own colour.
          bgcolor: `${fill}33`,
        }}
      >
        <Box
          sx={{
            width: `${clamped}%`,
            height: '100%',
            bgcolor: fill,
            borderRadius: `${height / 2}px`,
            transition: 'width 200ms ease-out',
          }}
        />
        {markerPercent !== undefined && markerPercent > 0 && markerPercent < 100 && (
          <Tooltip title={markerLabel ?? ''} placement="top">
            <Box
              sx={{
                position: 'absolute',
                top: -3,
                bottom: -3,
                left: `${markerPercent}%`,
                width: 2,
                bgcolor: 'text.primary',
                borderRadius: 1,
                opacity: 0.6,
              }}
            />
          </Tooltip>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: severity === 'normal' ? 'text.secondary' : fill }} aria-hidden />
        <Typography variant="caption" color="text.secondary">
          {statusLabel}
        </Typography>
      </Stack>
    </Box>
  );
}
