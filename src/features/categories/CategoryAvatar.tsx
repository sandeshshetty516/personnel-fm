import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import Avatar from '@mui/material/Avatar';
import type { CategoryIcon } from '../../types/category';
import { CATEGORY_ICON_COMPONENTS } from './categoryIcons';

export function CategoryAvatar({ icon, color, size = 36 }: { icon: CategoryIcon; color: string; size?: number }) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon] ?? CategoryOutlined;
  return (
    <Avatar sx={{ bgcolor: color, width: size, height: size }} aria-hidden>
      <Icon sx={{ fontSize: size * 0.55, color: '#fff' }} />
    </Avatar>
  );
}
