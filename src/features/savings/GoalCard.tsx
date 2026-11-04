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
import type { GoalStatus, SavingsGoal } from '../../types/savings';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';

export type GoalAction = 'add' | 'withdraw' | 'history' | 'edit' | GoalStatus;

export function GoalCard({ goal, onAction }: { goal: SavingsGoal; onAction: (action: GoalAction) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const money = (paise: number) => formatMoney(paise, goal.currency);
  const active = goal.status === 'ACTIVE';
  const act = (action: GoalAction) => {
    setAnchor(null);
    onAction(action);
  };

  let caption = `${money(goal.remainingPaise)} to go`;
  if (goal.isTargetReached) caption = 'Target reached';
  else if (goal.monthlyNeededPaise) caption += ` · ${money(goal.monthlyNeededPaise)}/month to hit the date`;

  return (
    <Card component="section" aria-label={goal.name} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography variant="h6" component="h2">
              {goal.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {goal.targetDate ? `Target ${formatCalendarDate(goal.targetDate)}` : 'No target date'}
            </Typography>
          </div>
          <IconButton aria-label={`More actions for ${goal.name}`} onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => act('history')}>History</MenuItem>
            <MenuItem onClick={() => act('edit')}>Edit</MenuItem>
            {active && <MenuItem onClick={() => act('COMPLETED')}>Mark as completed</MenuItem>}
            {goal.status !== 'ARCHIVED' && <MenuItem onClick={() => act('ARCHIVED')}>Archive</MenuItem>}
            {!active && <MenuItem onClick={() => act('ACTIVE')}>Reactivate</MenuItem>}
          </Menu>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', mt: 2, mb: 1, flexWrap: 'wrap', columnGap: 1 }}>
          <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
            {money(goal.savedPaise)}
          </Typography>
          <Typography color="text.secondary">of {money(goal.targetAmountPaise)}</Typography>
          {goal.status !== 'ACTIVE' && (
            <Chip size="small" label={goal.status === 'COMPLETED' ? 'Completed' : 'Archived'} />
          )}
        </Stack>
        <Meter
          percent={goal.progressPercent}
          severity={goal.isTargetReached ? 'good' : 'normal'}
          statusLabel={`${goal.progressPercent}% · ${caption}`}
          valueText={`${money(goal.savedPaise)} saved of ${money(goal.targetAmountPaise)}`}
          height={10}
        />
        {goal.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {goal.notes}
          </Typography>
        )}
      </CardContent>
      {active && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" size="small" onClick={() => onAction('add')}>
            Add money
          </Button>
          <Button size="small" onClick={() => onAction('withdraw')} disabled={goal.savedPaise === 0}>
            Withdraw
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
