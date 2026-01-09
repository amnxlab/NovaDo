import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip
} from '@mui/material';
import { createTask } from '../store/slices/tasksSlice';
import { toast } from 'react-toastify';

const validationSchema = yup.object({
  title: yup.string().required('Title is required'),
  list: yup.string().required('List is required')
});

const CreateTaskDialog = ({ open, onClose, defaultListId }) => {
  const dispatch = useDispatch();
  const { items: lists } = useSelector((state) => state.lists);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      list: defaultListId || '',
      dueDate: '',
      dueTime: '',
      priority: 'none',
      tags: []
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      const result = await dispatch(createTask(values));
      if (createTask.fulfilled.match(result)) {
        toast.success('Task created successfully!');
        resetForm();
        onClose();
      }
    }
  });

  const availableLists = lists.filter((l) => !l.isSmart);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              id="title"
              name="title"
              label="Task Title"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
              autoFocus
            />

            <TextField
              fullWidth
              id="description"
              name="description"
              label="Description"
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
            />

            <FormControl fullWidth>
              <InputLabel>List</InputLabel>
              <Select
                id="list"
                name="list"
                value={formik.values.list}
                onChange={formik.handleChange}
                label="List"
                error={formik.touched.list && Boolean(formik.errors.list)}
              >
                {availableLists.map((list) => (
                  <MenuItem key={list._id} value={list._id}>
                    {list.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                id="dueDate"
                name="dueDate"
                label="Due Date"
                type="date"
                value={formik.values.dueDate}
                onChange={formik.handleChange}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                id="dueTime"
                name="dueTime"
                label="Due Time"
                type="time"
                value={formik.values.dueTime}
                onChange={formik.handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                id="priority"
                name="priority"
                value={formik.values.priority}
                onChange={formik.handleChange}
                label="Priority"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Create Task
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateTaskDialog;

