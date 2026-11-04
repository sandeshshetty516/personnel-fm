import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import { formatMoney, sumPaise } from '../../utils/money';
import { AccountFormDialog } from './AccountFormDialog';
import { useAccounts, useDeactivateAccount, useUpdateAccount } from './accountsApi';
import { ACCOUNT_TYPE_META, isLiability } from './accountTypes';

/** Totals per currency: amounts in different currencies are never added together (spec §11). */
function totalsByCurrency(accounts: Account[]) {
  const groups = new Map<string, number[]>();
  for (const account of accounts.filter((a) => a.isActive)) {
    groups.set(account.currency, [...(groups.get(account.currency) ?? []), account.currentBalancePaise]);
  }
  return [...groups.entries()].map(([currency, balances]) => ({ currency, totalPaise: sumPaise(balances) }));
}

function BalanceText({ account }: { account: Account }) {
  const owed = isLiability(account.accountType) && account.currentBalancePaise < 0;
  const amount = owed ? -account.currentBalancePaise : account.currentBalancePaise;
  return (
    <div>
      <Typography variant="caption" color="text.secondary">
        {owed ? 'Outstanding' : 'Current balance'}
      </Typography>
      <Typography
        variant="h6"
        component="p"
        color={owed || account.currentBalancePaise < 0 ? 'error.main' : 'text.primary'}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatMoney(amount, account.currency)}
      </Typography>
    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onViewTransactions,
  onDeactivate,
  onReactivate,
}: {
  account: Account;
  onEdit: () => void;
  onViewTransactions: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { label, Icon } = ACCOUNT_TYPE_META[account.accountType];
  const close = () => setAnchor(null);
  const subtitle = [account.institution, account.lastFourDigits && `•••• ${account.lastFourDigits}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card sx={{ height: '100%', opacity: account.isActive ? 1 : 0.65 }} aria-label={account.name}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <Icon fontSize="small" />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {account.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle || label}
            </Typography>
          </Box>
          <IconButton aria-label={`Actions for ${account.name}`} onClick={(e) => setAnchor(e.currentTarget)} edge="end">
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
            <MenuItem
              onClick={() => {
                close();
                onViewTransactions();
              }}
            >
              View transactions
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onEdit();
              }}
            >
              Edit
            </MenuItem>
            {account.isActive ? (
              <MenuItem
                onClick={() => {
                  close();
                  onDeactivate();
                }}
                sx={{ color: 'error.main' }}
              >
                Deactivate
              </MenuItem>
            ) : (
              <MenuItem
                onClick={() => {
                  close();
                  onReactivate();
                }}
              >
                Reactivate
              </MenuItem>
            )}
          </Menu>
        </Stack>
        <Stack direction="row" sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <BalanceText account={account} />
          <Stack direction="row" spacing={0.5}>
            <Chip label={label} size="small" variant="outlined" />
            {!account.isActive && <Chip label="Inactive" size="small" />}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AccountsPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  const { data: accounts, error, isPending, refetch } = useAccounts(showInactive);
  const deactivate = useDeactivateAccount();
  const update = useUpdateAccount();
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [toDeactivate, setToDeactivate] = useState<Account | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await deactivate.mutateAsync(toDeactivate.id);
      notify(`${toDeactivate.name} deactivated`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setToDeactivate(null);
    }
  };

  const reactivate = async (account: Account) => {
    try {
      await update.mutateAsync({ id: account.id, input: { isActive: true } });
      notify(`${account.name} reactivated`);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const totals = accounts ? totalsByCurrency(accounts) : [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Accounts"
        subtitle="Bank accounts, cash, cards and wallets you track."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add account
          </Button>
        }
      />

      {totals.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {totals.map(({ currency, totalPaise }) => (
            <Card key={currency} sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Net balance{totals.length > 1 ? ` (${currency})` : ''}
                </Typography>
                <Typography
                  variant="h4"
                  component="p"
                  color={totalPaise < 0 ? 'error.main' : 'text.primary'}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(totalPaise, currency)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <FormControlLabel
        control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
        label="Show inactive accounts"
      />

      {error && <QueryError error={error} onRetry={() => refetch()} />}

      {isPending && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      )}

      {accounts?.length === 0 && (
        <EmptyState
          icon={<SavingsOutlined color="primary" sx={{ fontSize: 40 }} />}
          title="No accounts yet"
          description="Add your bank accounts, cash and cards to start tracking balances."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Add your first account
            </Button>
          }
        />
      )}

      {accounts && accounts.length > 0 && (
        <Grid container spacing={2}>
          {accounts.map((account) => (
            <Grid key={account.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <AccountCard
                account={account}
                onEdit={() => {
                  setEditing(account);
                  setFormKey((k) => k + 1);
                  setFormOpen(true);
                }}
                onViewTransactions={() => navigate(`/transactions?accountId=${account.id}&period=all`)}
                onDeactivate={() => setToDeactivate(account)}
                onReactivate={() => reactivate(account)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <AccountFormDialog key={formKey} open={formOpen} account={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={Boolean(toDeactivate)}
        title={`Deactivate ${toDeactivate?.name ?? 'account'}?`}
        description="It will be hidden from your account list and can't be used for new transactions or transfers. Its history stays in your reports, and you can reactivate it at any time."
        confirmLabel="Deactivate"
        destructive
        loading={deactivate.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </Stack>
  );
}
