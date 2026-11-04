import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import type { GoalContribution, SavingsGoal } from '../../types/savings';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { useDeleteContribution, useGoalHistory } from './savingsApi';

/** Contribution history (FR-041), with a way to remove a mistaken entry. */
export function GoalHistoryDialog({
  goal,
  accounts,
  onClose,
}: {
  goal: SavingsGoal;
  accounts: Account[];
  onClose: () => void;
}) {
  const notify = useNotify();
  const history = useGoalHistory(goal.id);
  const remove = useDeleteContribution();
  const [confirming, setConfirming] = useState<GoalContribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  const confirmRemove = async () => {
    if (!confirming) return;
    setError(null);
    try {
      await remove.mutateAsync({ goalId: goal.id, contributionId: confirming.id });
      notify('Entry removed');
      setConfirming(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{goal.name} · history</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {history.isPending && <Skeleton variant="rounded" height={120} />}
        {history.data?.length === 0 && <Typography color="text.secondary">No contributions yet.</Typography>}
        {history.data && history.data.length > 0 && (
          <List aria-label="Contribution history">
            {history.data.map((c) => {
              const withdrawal = c.type === 'WITHDRAWAL';
              const details = [formatCalendarDate(c.date), c.accountId && accountName.get(c.accountId), c.notes].filter(
                Boolean,
              );
              return (
                <ListItem
                  key={c.id}
                  divider
                  secondaryAction={
                    confirming?.id === c.id ? (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setConfirming(null)}>
                          Keep
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          onClick={confirmRemove}
                          loading={remove.isPending}
                        >
                          Remove
                        </Button>
                      </Stack>
                    ) : (
                      <IconButton
                        edge="end"
                        aria-label={`Remove ${withdrawal ? 'withdrawal' : 'contribution'} of ${formatMoney(c.amountPaise, goal.currency)}`}
                        onClick={() => setConfirming(c)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    )
                  }
                  sx={{ pr: confirming?.id === c.id ? 22 : 7 }}
                >
                  <ListItemText
                    primary={`${withdrawal ? 'Withdrew' : 'Added'} ${formatMoney(c.amountPaise, goal.currency)}`}
                    secondary={details.join(' · ')}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
