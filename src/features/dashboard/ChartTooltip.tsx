import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export interface TooltipRow {
  label: string;
  value: string;
  /** Series colour for the line key; omitted for derived rows such as "Net". */
  color?: string;
}

/**
 * One tooltip for every series at the hovered point: values lead, labels follow, series keyed by a
 * short line in their colour. Text stays in text ink, never the series colour. Values are rendered
 * as React text, so category names are never interpreted as markup.
 */
export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <Paper elevation={3} sx={{ px: 1.5, py: 1, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      {rows.map((row) => (
        <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Box
            aria-hidden
            sx={{ width: 12, height: 2, borderRadius: 1, bgcolor: row.color ?? 'transparent', flexShrink: 0 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {row.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {row.label}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}
