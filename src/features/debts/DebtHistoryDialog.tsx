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
import { useState } from 'react';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import { entryLabel, type Debt, type DebtEntry } from '../../types/debt';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { useDebtEntries, useDeleteEntry } from './debtsApi';

/** Entry history (FR-076), with a way to remove a mistaken entry and its transaction. */
export function DebtHistoryDialog({
  debt,
  accounts,
  onClose,
}: {
  debt: Debt;
  accounts: Account[];
  onClose: () => void;
}) {
  const notify = useNotify();
  const entries = useDebtEntries(debt.id);
  const remove = useDeleteEntry();
  const [confirming, setConfirming] = useState<DebtEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  const confirmRemove = async () => {
    if (!confirming) return;
    setError(null);
    try {
      await remove.mutateAsync({ debtId: debt.id, entryId: confirming.id });
      notify('Entry removed');
      setConfirming(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{debt.personName} · history</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {entries.isPending && <Skeleton variant="rounded" height={120} />}
        {entries.data && (
          <List aria-label="Entry history">
            {entries.data.map((entry) => {
              const label = `${entryLabel(debt.direction, entry.type)} ${formatMoney(entry.amountPaise, debt.currency)}`;
              const details = [
                formatCalendarDate(entry.date),
                entry.accountId ? accountName.get(entry.accountId) : 'No account linked',
                entry.notes,
              ].filter(Boolean);
              return (
                <ListItem
                  key={entry.id}
                  divider
                  secondaryAction={
                    confirming?.id === entry.id ? (
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
                      <IconButton edge="end" aria-label={`Remove ${label}`} onClick={() => setConfirming(entry)}>
                        <DeleteOutlined />
                      </IconButton>
                    )
                  }
                  sx={{ pr: confirming?.id === entry.id ? 22 : 7 }}
                >
                  <ListItemText primary={label} secondary={details.join(' · ')} />
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
