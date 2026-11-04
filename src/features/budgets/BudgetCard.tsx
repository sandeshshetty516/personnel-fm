import MoreVert from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Meter } from '../../components/Meter';
import type { BudgetWithSummary, Utilisation } from '../../types/budget';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { CategoryAvatar } from '../categories/CategoryAvatar';
import { budgetStatus } from './budgetStatus';

function describePeriod({ budget }: BudgetWithSummary) {
  if (budget.period === 'CUSTOM') {
    return `${formatCalendarDate(budget.startDate, 'D MMM')} – ${formatCalendarDate(budget.endDate!, 'D MMM YYYY')}`;
  }
  const from = formatCalendarDate(budget.startDate, 'MMM YYYY');
  return budget.endDate
    ? `Monthly · ${from} – ${formatCalendarDate(budget.endDate, 'MMM YYYY')}`
    : `Monthly · since ${from}`;
}

function spentText(u: Utilisation, currency: string) {
  return `${formatMoney(u.spentPaise, currency)} of ${formatMoney(u.limitPaise, currency)}`;
}

function remainingText(u: Utilisation, currency: string) {
  return u.remainingPaise >= 0
    ? `${formatMoney(u.remainingPaise, currency)} left`
    : `${formatMoney(-u.remainingPaise, currency)} over`;
}

export function BudgetCard({
  item,
  onEdit,
  onDelete,
}: {
  item: BudgetWithSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { budget, summary } = item;
  const { currency } = budget;
  const overall = budgetStatus(summary.overall);
  const close = () => setAnchor(null);

  return (
    <Card component="section" aria-label={budget.name}>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Typography variant="h6" component="h2">
              {budget.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {describePeriod(item)}
            </Typography>
          </div>
          <IconButton aria-label={`Actions for ${budget.name}`} onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
            <MenuItem
              onClick={() => {
                close();
                onEdit();
              }}
            >
              Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onDelete();
              }}
              sx={{ color: 'error.main' }}
            >
              Delete
            </MenuItem>
          </Menu>
        </Stack>

        {summary.period === null ? (
          <Chip label="Not active in this period" size="small" sx={{ mt: 2 }} />
        ) : (
          <>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'baseline' }, mt: 2, mb: 1 }}
            >
              <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
                {formatMoney(summary.overall.spentPaise, currency)}
                <Typography component="span" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  of {formatMoney(summary.overall.limitPaise, currency)}
                </Typography>
              </Typography>
              <Typography variant="body2" color={summary.overall.remainingPaise < 0 ? 'error.main' : 'text.secondary'}>
                {remainingText(summary.overall, currency)}
              </Typography>
            </Stack>
            <Meter
              percent={summary.overall.utilizationPercent}
              severity={overall.severity}
              statusLabel={`${summary.overall.utilizationPercent}% used · ${overall.label}`}
              valueText={spentText(summary.overall, currency)}
              markerPercent={summary.elapsedPercent}
              markerLabel={`${summary.elapsedPercent}% of the period has passed`}
              height={10}
            />

            {summary.categories.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  {summary.categories.map((c) => {
                    const status = budgetStatus(c);
                    return (
                      <Box key={c.categoryId}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                          <CategoryAvatar icon={c.icon} color={c.color} size={24} />
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                            {c.name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {spentText(c, currency)}
                          </Typography>
                        </Stack>
                        <Meter
                          percent={c.utilizationPercent}
                          severity={status.severity}
                          statusLabel={`${c.utilizationPercent}% · ${status.label} · ${remainingText(c, currency)}`}
                          valueText={`${c.name}: ${spentText(c, currency)}`}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}

            {summary.unbudgetedSpentPaise > 0 && summary.categories.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {formatMoney(summary.unbudgetedSpentPaise, currency)} spent in categories without their own limit.
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
