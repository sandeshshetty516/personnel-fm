import MoreVert from '@mui/icons-material/MoreVert';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { Fragment, useState } from 'react';
import type { Account } from '../../types/account';
import type { Category } from '../../types/category';
import { isTransfer, PAYMENT_METHOD_LABELS, type Transaction } from '../../types/transaction';
import { formatCalendarDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { CategoryAvatar } from '../categories/CategoryAvatar';

interface Lookups {
  accounts: Map<string, Account>;
  categories: Map<string, Category>;
}

function describe(tx: Transaction, { accounts, categories }: Lookups) {
  const account = accounts.get(tx.accountId);
  const currency = account?.currency ?? 'INR';
  const counterpart = tx.counterpartAccountId ? accounts.get(tx.counterpartAccountId)?.name : undefined;

  if (isTransfer(tx)) {
    const detail =
      tx.type === 'TRANSFER_OUT'
        ? `${account?.name ?? 'Account'} → ${counterpart ?? 'account'}`
        : `${counterpart ?? 'Account'} → ${account?.name ?? 'account'}`;
    // In an account-filtered list an incoming leg adds money; otherwise a transfer is neutral.
    const sign = tx.type === 'TRANSFER_IN' ? '+' : '−';
    return {
      detail: `Transfer · ${detail}`,
      amount: `${sign}${formatMoney(tx.amountPaise, currency)}`,
      color: 'text.secondary',
    };
  }

  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined;
  const parts = [
    category?.name ?? 'Uncategorised',
    account?.name,
    tx.paymentMethod && PAYMENT_METHOD_LABELS[tx.paymentMethod],
  ];
  const income = tx.type === 'INCOME';
  return {
    detail: parts.filter(Boolean).join(' · '),
    amount: `${income ? '+' : '−'}${formatMoney(tx.amountPaise, currency)}`,
    color: income ? 'success.main' : 'error.main',
    category,
  };
}

function Row({
  tx,
  lookups,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  lookups: Lookups;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { detail, amount, color, category } = describe(tx, lookups);
  const close = () => setAnchor(null);

  return (
    <ListItem
      secondaryAction={
        <IconButton edge="end" aria-label={`Actions for ${tx.title}`} onClick={(e) => setAnchor(e.currentTarget)}>
          <MoreVert />
        </IconButton>
      }
      sx={{ pr: 7 }}
    >
      <ListItemAvatar>
        {category ? (
          <CategoryAvatar icon={category.icon} color={category.color} />
        ) : (
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'text.primary' }} aria-hidden>
            <SwapHoriz fontSize="small" />
          </Avatar>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={tx.title}
        secondary={detail}
        slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
        sx={{ minWidth: 0, mr: 2 }}
      />
      <Typography
        component="span"
        color={color}
        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        {amount}
      </Typography>
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
    </ListItem>
  );
}

/** Transactions grouped under date headings, in the order the API returned them. */
export function TransactionList({
  transactions,
  accounts,
  categories,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const lookups: Lookups = {
    accounts: new Map(accounts.map((a) => [a.id, a])),
    categories: new Map(categories.map((c) => [c.id, c])),
  };

  const groups: { date: string; items: Transaction[] }[] = [];
  for (const tx of transactions) {
    const last = groups.at(-1);
    if (last?.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  }

  return (
    <Card>
      <List aria-label="Transactions" disablePadding>
        {groups.map((group) => (
          <Fragment key={group.date}>
            <ListSubheader sx={{ bgcolor: 'background.default', lineHeight: '36px' }}>
              {formatCalendarDate(group.date, 'ddd, DD MMM YYYY')}
            </ListSubheader>
            {group.items.map((tx) => (
              <Row key={tx.id} tx={tx} lookups={lookups} onEdit={() => onEdit(tx)} onDelete={() => onDelete(tx)} />
            ))}
          </Fragment>
        ))}
      </List>
      <Box sx={{ height: 4 }} />
    </Card>
  );
}
