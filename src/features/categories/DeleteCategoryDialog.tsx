import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useNotify } from '../../contexts/notifications';
import { ApiError } from '../../services/apiClient';
import type { Category } from '../../types/category';
import { isCategoryInUse, useDeleteCategory, useUpdateCategory } from './categoriesApi';

interface DeleteCategoryDialogProps {
  category: Category | null;
  /** Active categories of all types; filtered to valid reassignment targets here. */
  categories: Category[];
  onClose: () => void;
}

/**
 * Two-step delete (FR-020): a plain confirmation first; if the API reports the category is
 * still used by transactions, offer to move them to another category or archive instead.
 * The parent remounts it (via key) for each category, which resets its state.
 */
export function DeleteCategoryDialog({ category, categories, onClose }: DeleteCategoryDialogProps) {
  const notify = useNotify();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();
  const [inUseCount, setInUseCount] = useState<number | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!category) return null;

  const targets = categories.filter((c) => c.type === category.type && c.id !== category.id && !c.isArchived);
  const busy = deleteCategory.isPending || updateCategory.isPending;

  const runDelete = async () => {
    setError(null);
    try {
      const result = await deleteCategory.mutateAsync({ id: category.id, reassignTo: reassignTo || undefined });
      const moved = result.reassignedTransactions;
      notify(moved > 0 ? `${category.name} deleted; ${moved} transactions moved` : `${category.name} deleted`);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && isCategoryInUse(err.details)) {
        setInUseCount(err.details.transactionCount);
      } else {
        setError(err instanceof Error ? err.message : 'Could not delete the category');
      }
    }
  };

  const archiveInstead = async () => {
    setError(null);
    try {
      await updateCategory.mutateAsync({ id: category.id, input: { isArchived: true } });
      notify(`${category.name} archived`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive the category');
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete {category.name}?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {inUseCount === null ? (
            <DialogContentText>This category will be permanently removed.</DialogContentText>
          ) : (
            <>
              <Alert severity="warning">
                {inUseCount} transaction{inUseCount === 1 ? ' uses' : 's use'} this category. Move{' '}
                {inUseCount === 1 ? 'it' : 'them'} to another category first, or archive this one to hide it while
                keeping your history.
              </Alert>
              <TextField
                select
                label="Move transactions to"
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                fullWidth
                disabled={targets.length === 0}
                helperText={targets.length === 0 ? `No other ${category.type.toLowerCase()} categories available` : ''}
              >
                {targets.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        {inUseCount !== null && (
          <Button onClick={archiveInstead} loading={updateCategory.isPending} disabled={busy}>
            Archive instead
          </Button>
        )}
        <Button
          variant="contained"
          color="error"
          onClick={runDelete}
          loading={deleteCategory.isPending}
          disabled={busy || (inUseCount !== null && !reassignTo)}
        >
          {inUseCount === null ? 'Delete' : 'Move and delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
