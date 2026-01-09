import React from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';
import { createList } from '../store/slices/listsSlice';
import { toast } from 'react-toastify';

const validationSchema = yup.object({
  name: yup.string().required('Name is required')
});

const CreateListDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      name: '',
      color: '#1890ff',
      icon: 'list'
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const result = await dispatch(createList(values));
      if (createList.fulfilled.match(result)) {
        toast.success('List created successfully!');
        resetForm();
        onClose();
      }
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>Create New List</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              id="name"
              name="name"
              label="List Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              autoFocus
            />

            <TextField
              fullWidth
              id="color"
              name="color"
              label="Color"
              type="color"
              value={formik.values.color}
              onChange={formik.handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Create List
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateListDialog;

