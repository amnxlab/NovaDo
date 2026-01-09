import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setToken, fetchCurrentUser } from '../store/slices/authSlice';
import LoadingScreen from '../components/LoadingScreen';
import { toast } from 'react-toastify';

const AuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Authentication failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token) {
      dispatch(setToken(token));
      dispatch(fetchCurrentUser()).then(() => {
        toast.success('Successfully signed in with Google!');
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, dispatch, navigate]);

  return <LoadingScreen />;
};

export default AuthCallback;

