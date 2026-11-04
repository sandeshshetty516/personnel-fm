import MoreVert from '@mui/icons-material/MoreVert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Meter } from '../../components/Meter';
import type { Debt } from '../../types/debt';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';

export type DebtAction = 'repay' | 'more' | 'writeOff' | 'history' | 'edit' | 'delete';

const STATUS_CHIPS = { SETTLED: 'Settled', WRITTEN_OFF: 'Written off' } as const;

export function DebtCard({ debt, onAction }: { debt: Debt; onAction: (action: DebtAction) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const money = (paise: number) => formatMoney(paise, debt.currency);
  const lent = debt.direction === 'LENT';
  const open = debt.status === 'OPEN';
  const act = (action: DebtAction) => {
    setAnchor(null);
    onAction(action);
  };

  const dates = [`Since ${formatCalendarDate(debt.startDate)}`];
  if (debt.dueDate) dates.push(`due ${formatCalendarDate(debt.dueDate)}`);
  const settledLabel = lent ? 'received back' : 'paid back';

  return (
    <Card component="section" aria-label={debt.personName} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography variant="h6" component="h2">
              {debt.personName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dates.join(' · ')}
            </Typography>
          </div>
          <IconButton aria-label={`More actions for ${debt.personName}`} onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => act('history')}>History</MenuItem>
            <MenuItem onClick={() => act('more')}>{lent ? 'Lend more' : 'Borrow more'}</MenuItem>
            {lent && open && <MenuItem onClick={() => act('writeOff')}>Write off</MenuItem>}
            <MenuItem onClick={() => act('edit')}>Edit</MenuItem>
            <MenuItem onClick={() => act('delete')} sx={{ color: 'error.main' }}>
              Delete
            </MenuItem>
          </Menu>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', mt: 2, mb: 1, flexWrap: 'wrap', columnGap: 1 }}>
          <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
            {money(debt.outstandingPaise)}
          </Typography>
          <Typography color="text.secondary">{lent ? 'owed to you' : 'you owe'}</Typography>
          {debt.isOverdue && <Chip size="small" color="error" label="Overdue" />}
          {debt.status !== 'OPEN' && <Chip size="small" label={STATUS_CHIPS[debt.status]} />}
        </Stack>
        <Meter
          percent={debt.progressPercent}
          severity={open ? 'normal' : 'good'}
          statusLabel={`${money(debt.repaidPaise)} ${settledLabel} of ${money(debt.principalPaise)}`}
          valueText={`${debt.progressPercent}% of ${money(debt.principalPaise)} ${settledLabel}`}
          height={10}
        />
        {debt.writtenOffPaise > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {money(debt.writtenOffPaise)} written off as bad debt
          </Typography>
        )}
        {(debt.phone || debt.notes) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {[debt.phone, debt.notes].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </CardContent>
      {open && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" size="small" onClick={() => onAction('repay')}>
            {lent ? 'Record repayment' : 'Record payment'}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
