import Add from '@mui/icons-material/Add';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import { Fragment, useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useNotify } from '../../contexts/notifications';
import type { Category, CategoryType } from '../../types/category';
import { useCategories, useUpdateCategory } from './categoriesApi';
import { CategoryFormDialog } from './CategoryFormDialog';
import { CategoryAvatar } from './CategoryAvatar';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

function CategoryRow({
  category,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <ListItem
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton aria-label={`Edit ${category.name}`} onClick={onEdit}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={category.isArchived ? 'Unarchive' : 'Archive'}>
            <IconButton
              aria-label={`${category.isArchived ? 'Unarchive' : 'Archive'} ${category.name}`}
              onClick={onToggleArchive}
            >
              {category.isArchived ? <UnarchiveOutlined fontSize="small" /> : <ArchiveOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton aria-label={`Delete ${category.name}`} onClick={onDelete}>
              <DeleteOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
      sx={{ opacity: category.isArchived ? 0.6 : 1, pr: 18 }}
    >
      <ListItemAvatar>
        <CategoryAvatar icon={category.icon} color={category.color} />
      </ListItemAvatar>
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <span>{category.name}</span>
            {category.isArchived && <Chip label="Archived" size="small" />}
          </Stack>
        }
        secondary={category.isDefault ? 'Default' : 'Custom'}
      />
    </ListItem>
  );
}

export function CategoriesPage() {
  const notify = useNotify();
  const [tab, setTab] = useState<CategoryType>('EXPENSE');
  const [showArchived, setShowArchived] = useState(false);
  // Always load archived ones too: reassignment and duplicate checks need the full picture.
  const { data: categories, error, isPending, refetch } = useCategories(true);
  const updateCategory = useUpdateCategory();
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const visible = (categories ?? []).filter((c) => c.type === tab && (showArchived || !c.isArchived));

  const toggleArchive = async (category: Category) => {
    try {
      await updateCategory.mutateAsync({ id: category.id, input: { isArchived: !category.isArchived } });
      notify(`${category.name} ${category.isArchived ? 'restored' : 'archived'}`);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Categories"
        subtitle="Organise income and expenses. Archived categories are hidden but keep their history."
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditing(null);
              setFormKey((k) => k + 1);
              setFormOpen(true);
            }}
          >
            Add category
          </Button>
        }
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Tabs value={tab} onChange={(_e, value: CategoryType) => setTab(value)} aria-label="Category type">
          <Tab label="Expense" value="EXPENSE" />
          <Tab label="Income" value="INCOME" />
        </Tabs>
        <FormControlLabel
          control={<Switch checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
          label="Show archived"
        />
      </Stack>

      {error && <QueryError error={error} onRetry={() => refetch()} />}

      {isPending && (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {categories && visible.length === 0 && (
        <EmptyState
          title={`No ${tab === 'EXPENSE' ? 'expense' : 'income'} categories`}
          description="Add one to start organising your transactions."
        />
      )}

      {visible.length > 0 && (
        <Card>
          <List aria-label={`${tab === 'EXPENSE' ? 'Expense' : 'Income'} categories`}>
            {visible.map((category, index) => (
              <Fragment key={category.id}>
                {index > 0 && <Divider component="li" variant="inset" />}
                <CategoryRow
                  category={category}
                  onEdit={() => {
                    setEditing(category);
                    setFormKey((k) => k + 1);
                    setFormOpen(true);
                  }}
                  onToggleArchive={() => toggleArchive(category)}
                  onDelete={() => setDeleting(category)}
                />
              </Fragment>
            ))}
          </List>
        </Card>
      )}

      <CategoryFormDialog
        key={formKey}
        open={formOpen}
        category={editing}
        defaultType={tab}
        onClose={() => setFormOpen(false)}
      />
      <DeleteCategoryDialog
        key={deleting?.id ?? 'none'}
        category={deleting}
        categories={categories ?? []}
        onClose={() => setDeleting(null)}
      />
    </Stack>
  );
}
