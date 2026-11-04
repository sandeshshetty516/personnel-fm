import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { formatMoney } from '../../utils/money';
import { useDebtSummary } from '../debts/debtsApi';

const MAX_PEOPLE = 3;

/** What other people owe the user and what the user owes them, as of today (FR-081). */
export function LendBorrowCard({ currency }: { currency: string }) {
  const summaries = useDebtSummary();
  const summary = summaries.data?.find((s) => s.currency === currency);
  const money = (paise: number) => formatMoney(paise, currency);
  const people = [...(summary?.people ?? [])]
    .sort((a, b) => Math.abs(b.netPaise) - Math.abs(a.netPaise))
    .slice(0, MAX_PEOPLE);

  return (
    <Card sx={{ height: '100%' }} component="section" aria-label="Lend and borrow">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            Lend & borrow
          </Typography>
          <Button component={RouterLink} to="/lend-borrow" size="small">
            {summary ? 'View all' : 'Record a loan'}
          </Button>
        </Stack>

        {summaries.isPending && <Skeleton variant="rounded" height={96} />}
        {summaries.data && !summary && (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No one owes you, and you owe no one.
          </Typography>
        )}

        {summary && (
          <>
            <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
              <div>
                <Typography variant="body2" color="text.secondary">
                  You'll receive
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
                  {money(summary.receivablePaise)}
                </Typography>
              </div>
              <div>
                <Typography variant="body2" color="text.secondary">
                  You owe
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
                  {money(summary.payablePaise)}
                </Typography>
              </div>
              {summary.overdueCount > 0 && (
                <Chip size="small" color="error" label={`${summary.overdueCount} overdue`} sx={{ alignSelf: 'center' }} />
              )}
            </Stack>
            <List dense disablePadding aria-label="People">
              {people.map((p) => (
                <ListItem key={p.personName} disableGutters>
                  <ListItemText primary={p.personName} secondary={p.netPaise >= 0 ? 'Owes you' : 'You owe'} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {money(Math.abs(p.netPaise))}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
}
