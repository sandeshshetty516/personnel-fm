import { zodResolver } from '@hookform/resolvers/zod';
import Check from '@mui/icons-material/Check';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { useNotify } from '../../contexts/notifications';
import { CATEGORY_ICONS, CATEGORY_TYPES, type Category, type CategoryType } from '../../types/category';
import { applyServerErrors } from '../../utils/formErrors';
import { useCreateCategory, useUpdateCategory } from './categoriesApi';
import { CategoryAvatar } from './CategoryAvatar';
import { CATEGORY_COLORS, CATEGORY_ICON_COMPONENTS } from './categoryIcons';

const schema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(40, 'Keep the name under 40 characters'),
  type: z.enum(CATEGORY_TYPES),
  icon: z.enum(CATEGORY_ICONS),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #1f6f5c'),
});
type Values = z.infer<typeof schema>;

const TYPE_LABELS: Record<CategoryType, string> = { EXPENSE: 'Expense', INCOME: 'Income' };

/** The parent remounts this dialog (new key) each time it opens, so the form always starts fresh. */
interface CategoryFormDialogProps {
  open: boolean;
  category: Category | null;
  /** Type preselected when creating (the tab the user is on). */
  defaultType: CategoryType;
  onClose: () => void;
}

export function CategoryFormDialog({ open, category, defaultType, onClose }: CategoryFormDialogProps) {
  const notify = useNotify();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [formError, setFormError] = useState<string | null>(null);

  const initialValues = (): Values =>
    category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
      : { name: '', type: defaultType, icon: 'other', color: CATEGORY_COLORS[0] };

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initialValues(),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (category) {
        const { type: _type, ...editable } = values;
        await updateCategory.mutateAsync({ id: category.id, input: editable });
        notify('Category updated');
      } else {
        await createCategory.mutateAsync(values);
        notify('Category created');
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'type', 'icon', 'color']));
    }
  });

  const [icon, color, name] = useWatch({ control, name: ['icon', 'color', 'name'] });

  return (
    <Dialog open={open} onClose={formState.isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={onSubmit} aria-label={category ? 'Edit category' : 'Add category'}>
        <DialogTitle>{category ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <CategoryAvatar icon={icon} color={color} size={48} />
              <FormTextField control={control} name="name" label="Name" autoFocus placeholder={name || 'e.g. Pets'} />
            </Stack>

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormLabel id="category-type-label">Type</FormLabel>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={field.value}
                    onChange={(_e, value: CategoryType | null) => value && field.onChange(value)}
                    disabled={Boolean(category)}
                    aria-labelledby="category-type-label"
                    sx={{ mt: 1 }}
                  >
                    {CATEGORY_TYPES.map((type) => (
                      <ToggleButton key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  {category && (
                    <FormLabel sx={{ display: 'block', mt: 0.5, fontSize: 12 }}>
                      The type can't change after a category is created.
                    </FormLabel>
                  )}
                </Box>
              )}
            />

            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <Box role="radiogroup" aria-label="Icon">
                  <FormLabel>Icon</FormLabel>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                      gap: 0.5,
                      mt: 1,
                    }}
                  >
                    {CATEGORY_ICONS.map((key) => {
                      const Icon = CATEGORY_ICON_COMPONENTS[key];
                      const selected = field.value === key;
                      return (
                        <Tooltip key={key} title={key.replace('-', ' ')}>
                          <IconButton
                            role="radio"
                            aria-checked={selected}
                            aria-label={key.replace('-', ' ')}
                            onClick={() => field.onChange(key)}
                            sx={{
                              border: 2,
                              borderColor: selected ? 'primary.main' : 'transparent',
                              bgcolor: selected ? 'action.selected' : undefined,
                            }}
                          >
                            <Icon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              )}
            />

            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Box role="radiogroup" aria-label="Colour">
                  <FormLabel>Colour</FormLabel>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {CATEGORY_COLORS.map((swatch) => {
                      const selected = field.value.toLowerCase() === swatch;
                      return (
                        <IconButton
                          key={swatch}
                          role="radio"
                          aria-checked={selected}
                          aria-label={`Colour ${swatch}`}
                          onClick={() => field.onChange(swatch)}
                          sx={{ bgcolor: swatch, width: 32, height: 32, '&:hover': { bgcolor: swatch, opacity: 0.85 } }}
                        >
                          {selected && <Check sx={{ color: '#fff', fontSize: 18 }} />}
                        </IconButton>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
