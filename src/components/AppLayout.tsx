import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import Logout from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth';
import { SideNav } from './SideNav';

const DRAWER_WIDTH = 240;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!user) return null;

  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={(event) => setAnchor(event.currentTarget)}
          aria-label="Account menu"
          aria-controls={anchor ? 'account-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={anchor ? 'true' : undefined}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
            {initials(user.fullName)}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        id="account-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{user.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            navigate('/settings');
          }}
        >
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem
          onClick={async () => {
            close();
            await logout();
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component={RouterLink}
            to="/"
            sx={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
          >
            <AccountBalanceWalletOutlined color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              MyFinance
            </Typography>
          </Box>
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Permanent sidebar on desktop, slide-out drawer on mobile and tablet. */}
        <Drawer
          variant="temporary"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          <Toolbar />
          <SideNav onNavigate={() => setMobileNavOpen(false)} />
        </Drawer>
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'block' },
            width: DRAWER_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            pt: 2,
          }}
        >
          <SideNav />
        </Box>

        <Container component="main" maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, flex: 1, minWidth: 0 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
