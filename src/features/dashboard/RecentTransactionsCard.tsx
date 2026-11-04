import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import type { Account } from '../../types/account';
import type { Category } from '../../types/category';
import { isTransfer, type Transaction } from '../../types/transaction';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { CategoryAvatar } from '../categories/CategoryAvatar';

export function RecentTransactionsCard({
  transactions,
  accounts,
  categories,
  loading,
  viewAllHref,
}: {
  transactions: Transaction[] | undefined;
  accounts: Account[];
  categories: Category[];
  loading: boolean;
  viewAllHref: string;
}) {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <Card sx={{ height: '100%' }} component="section" aria-label="Recent transactions">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            Recent transactions
          </Typography>
          <Button component={RouterLink} to={viewAllHref} size="small">
            View all
          </Button>
        </Stack>

        {loading && !transactions && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        )}

        {transactions?.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No transactions in this period.
          </Typography>
        )}

        {transactions && transactions.length > 0 && (
          <List dense disablePadding>
            {transactions.map((tx) => {
              const account = accountById.get(tx.accountId);
              const currency = account?.currency ?? 'INR';
              const category = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
              const transfer = isTransfer(tx);
              const sign = tx.type === 'INCOME' ? '+' : transfer ? '' : '−';
              return (
                <ListItem key={tx.id} disableGutters>
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    {category ? (
                      <CategoryAvatar icon={category.icon} color={category.color} size={32} />
                    ) : (
                      <Avatar
                        sx={{ width: 32, height: 32, bgcolor: 'action.selected', color: 'text.primary' }}
                        aria-hidden
                      >
                        <SwapHoriz fontSize="small" />
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={tx.title}
                    secondary={`${formatCalendarDate(tx.date, 'DD MMM')} · ${transfer ? 'Transfer' : (category?.name ?? 'Uncategorised')}`}
                    slotProps={{ primary: { noWrap: true } }}
                    sx={{ minWidth: 0, mr: 1 }}
                  />
                  <Typography
                    variant="body2"
                    color={tx.type === 'INCOME' ? 'success.main' : transfer ? 'text.secondary' : 'text.primary'}
                    sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                  >
                    {sign}
                    {formatMoney(tx.amountPaise, currency)}
                  </Typography>
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
