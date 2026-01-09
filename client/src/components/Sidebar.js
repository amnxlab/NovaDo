import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Divider,
  Collapse,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CheckCircle as TaskIcon,
  CalendarMonth as CalendarIcon,
  FitnessCenter as HabitIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  Inbox as InboxIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  List as ListIcon,
  CheckCircleOutline as CompletedIcon
} from '@mui/icons-material';
import { setSidebarOpen } from '../store/slices/uiSlice';
import CreateListDialog from './CreateListDialog';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { items: lists } = useSelector((state) => state.lists);
  
  const [listsExpanded, setListsExpanded] = useState(true);
  const [createListOpen, setCreateListOpen] = useState(false);

  const drawerWidth = 280;

  const mainMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' },
    { text: 'Habits', icon: <HabitIcon />, path: '/habits' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  const smartListIcons = {
    'Inbox': <InboxIcon />,
    'Today': <TodayIcon />,
    'Next 7 Days': <DateRangeIcon />,
    'All': <ListIcon />,
    'Completed': <CompletedIcon />
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      dispatch(setSidebarOpen(false));
    }
  };

  const handleListClick = (listId) => {
    navigate(`/tasks/${listId}`);
    if (isMobile) {
      dispatch(setSidebarOpen(false));
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          TaskFlow
        </Typography>
      </Box>

      <Divider />

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {mainMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <ListItem>
          <ListItemButton onClick={() => setListsExpanded(!listsExpanded)}>
            <ListItemText primary="Lists" />
            {listsExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={listsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {lists
              .filter((list) => list.isDefault || list.isSmart)
              .map((list) => (
                <ListItem key={list._id} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={location.pathname === `/tasks/${list._id}`}
                    onClick={() => handleListClick(list._id)}
                  >
                    <ListItemIcon sx={{ color: list.color }}>
                      {smartListIcons[list.name] || <ListIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={list.name}
                      secondary={list.taskCount > 0 ? `${list.taskCount} tasks` : null}
                    />
                  </ListItemButton>
                </ListItem>
              ))}

            <Divider sx={{ my: 1 }} />

            {lists
              .filter((list) => !list.isDefault && !list.isSmart)
              .map((list) => (
                <ListItem key={list._id} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={location.pathname === `/tasks/${list._id}`}
                    onClick={() => handleListClick(list._id)}
                  >
                    <ListItemIcon sx={{ color: list.color }}>
                      <ListIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={list.name}
                      secondary={list.taskCount > 0 ? `${list.taskCount} tasks` : null}
                    />
                  </ListItemButton>
                </ListItem>
              ))}

            <ListItem>
              <Button
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => setCreateListOpen(true)}
                sx={{ justifyContent: 'flex-start', pl: 4 }}
              >
                New List
              </Button>
            </ListItem>
          </List>
        </Collapse>
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={() => dispatch(setSidebarOpen(false))}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        {drawer}
      </Drawer>

      <CreateListDialog
        open={createListOpen}
        onClose={() => setCreateListOpen(false)}
      />
    </>
  );
};

export default Sidebar;

