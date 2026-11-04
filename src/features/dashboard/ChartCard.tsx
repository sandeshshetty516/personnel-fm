import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  /** Shown instead of the chart when there is nothing to plot. */
  empty?: ReactNode;
  /** The same data as a table: every chart has an accessible, colour-free alternative. */
  table: TableView;
  children: ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, loading, empty, table, children, height = 280 }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  let body: ReactNode;
  if (loading) body = <Skeleton variant="rounded" height={height} />;
  else if (empty) body = <Box sx={{ height, display: 'grid', placeItems: 'center' }}>{empty}</Box>;
  else if (view === 'table') {
    body = (
      <Box sx={{ maxHeight: height, overflow: 'auto' }}>
        <Table size="small" aria-label={`${title} data`}>
          <TableHead>
            <TableRow>
              {table.columns.map((column, i) => (
                <TableCell key={column} align={i === 0 ? 'left' : 'right'}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow key={String(row[0])}>
                {row.map((cell, i) => (
                  <TableCell key={i} align={i === 0 ? 'left' : 'right'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  } else body = <Box sx={{ height }}>{children}</Box>;

  return (
    <Card sx={{ height: '100%' }} component="section" aria-label={title}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <div>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </div>
          {!empty && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_e, next: 'chart' | 'table' | null) => next && setView(next)}
              aria-label={`${title} view`}
            >
              <ToggleButton value="chart" aria-label="Chart view">
                <BarChartOutlined fontSize="small" />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <TableRowsOutlined fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
        {body}
      </CardContent>
    </Card>
  );
}
