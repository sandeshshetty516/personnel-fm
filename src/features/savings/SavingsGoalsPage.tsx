import Add from '@mui/icons-material/Add';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useNotify } from '../../contexts/notifications';
import type { GoalStatus, SavingsGoal } from '../../types/savings';
import { useAccounts } from '../accounts/accountsApi';
import { ContributionDialog } from './ContributionDialog';
import { GoalCard, type GoalAction } from './GoalCard';
import { GoalFormDialog } from './GoalFormDialog';
import { GoalHistoryDialog } from './GoalHistoryDialog';
import { useGoals, useUpdateGoal } from './savingsApi';

const STATUS_MESSAGES: Record<GoalStatus, string> = {
  ACTIVE: 'reactivated',
  COMPLETED: 'marked as completed',
  ARCHIVED: 'archived',
};

type Dialog =
  { kind: 'form'; goal: SavingsGoal | null } | { kind: 'add' | 'withdraw' | 'history'; goal: SavingsGoal } | null;

export function SavingsGoalsPage() {
  const notify = useNotify();
  const [status, setStatus] = useState<GoalStatus>('ACTIVE');
  const goals = useGoals(status);
  const accounts = useAccounts(true).data ?? [];
  const updateGoal = useUpdateGoal();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const open = (next: NonNullable<Dialog>) => {
    setDialogKey((k) => k + 1);
    setDialog(next);
  };

  const handle = async (goal: SavingsGoal, action: GoalAction) => {
    if (action === 'add' || action === 'withdraw' || action === 'history') return open({ kind: action, goal });
    if (action === 'edit') return open({ kind: 'form', goal });
    try {
      await updateGoal.mutateAsync({ id: goal.id, input: { status: action } });
      notify(`${goal.name} ${STATUS_MESSAGES[action]}`);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Savings goals"
        subtitle="Set money aside for what matters. Contributions are not counted as expenses."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => open({ kind: 'form', goal: null })}>
            New goal
          </Button>
        }
      />

      <Tabs value={status} onChange={(_e, value: GoalStatus) => setStatus(value)} aria-label="Goal status">
        <Tab label="Active" value="ACTIVE" />
        <Tab label="Completed" value="COMPLETED" />
        <Tab label="Archived" value="ARCHIVED" />
      </Tabs>

      {goals.error && <QueryError error={goals.error} onRetry={() => goals.refetch()} />}

      {goals.isPending && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      )}

      {goals.data?.length === 0 && (
        <EmptyState
          icon={<SavingsOutlined color="primary" sx={{ fontSize: 40 }} />}
          title={status === 'ACTIVE' ? 'No active goals' : `No ${status.toLowerCase()} goals`}
          description={
            status === 'ACTIVE'
              ? 'Create a goal such as an emergency fund or a holiday, then add money as you save.'
              : undefined
          }
          action={
            status === 'ACTIVE' ? (
              <Button variant="contained" startIcon={<Add />} onClick={() => open({ kind: 'form', goal: null })}>
                Create a goal
              </Button>
            ) : undefined
          }
        />
      )}

      {goals.data && goals.data.length > 0 && (
        <Grid container spacing={2}>
          {goals.data.map((goal) => (
            <Grid key={goal.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <GoalCard goal={goal} onAction={(action) => handle(goal, action)} />
            </Grid>
          ))}
        </Grid>
      )}

      {dialog?.kind === 'form' && (
        <GoalFormDialog key={dialogKey} open goal={dialog.goal} onClose={() => setDialog(null)} />
      )}
      {(dialog?.kind === 'add' || dialog?.kind === 'withdraw') && (
        <ContributionDialog
          key={dialogKey}
          goal={dialog.goal}
          type={dialog.kind === 'add' ? 'CONTRIBUTION' : 'WITHDRAWAL'}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'history' && (
        <GoalHistoryDialog key={dialogKey} goal={dialog.goal} accounts={accounts} onClose={() => setDialog(null)} />
      )}
    </Stack>
  );
}
