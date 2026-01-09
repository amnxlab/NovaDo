import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  Chip
} from '@mui/material';
import { AutoAwesome as AIIcon, Send as SendIcon } from '@mui/icons-material';
import { setSmartInputOpen } from '../store/slices/uiSlice';
import { createTask } from '../store/slices/tasksSlice';
import api from '../services/api';
import { toast } from 'react-toastify';

const SmartInput = () => {
  const dispatch = useDispatch();
  const { smartInputOpen } = useSelector((state) => state.ui);
  const { items: lists } = useSelector((state) => state.lists);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [parsedTask, setParsedTask] = useState(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [llmConfigured, setLlmConfigured] = useState(true);

  const handleClose = () => {
    dispatch(setSmartInputOpen(false));
    setInput('');
    setConversation([]);
    setParsedTask(null);
    setNeedsClarification(false);
    setClarificationQuestion('');
  };

  const handleParse = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      const response = await api.post('/llm/parse', {
        input,
        context: { lists: lists.map(l => ({ id: l._id, name: l.name })) }
      });

      if (response.data.success) {
        const { data, needsClarification: needs, clarificationQuestion: question } = response.data;
        
        setParsedTask(data);
        setNeedsClarification(needs);
        setClarificationQuestion(question);

        setConversation([
          ...conversation,
          { role: 'user', content: input },
          {
            role: 'assistant',
            content: needs ? question : 'Task parsed successfully! Review and create.'
          }
        ]);

        if (!needs) {
          setInput('');
        }
      } else {
        toast.error(response.data.error || 'Failed to parse input');
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('not configured')) {
        setLlmConfigured(false);
        toast.error('Please configure your LLM API key in settings');
      } else {
        toast.error('Failed to parse input. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueConversation = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      const response = await api.post('/llm/chat', {
        message: input,
        conversationHistory: conversation
      });

      if (response.data.success) {
        const { data, needsClarification: needs, clarificationQuestion: question } = response.data;
        
        setParsedTask(data);
        setNeedsClarification(needs);
        setClarificationQuestion(question);

        setConversation([
          ...conversation,
          { role: 'user', content: input },
          {
            role: 'assistant',
            content: needs ? question : 'Great! Task is ready to be created.'
          }
        ]);

        if (!needs) {
          setInput('');
        }
      }
    } catch (error) {
      toast.error('Failed to process response');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!parsedTask) return;

    // Find inbox list as default
    const inboxList = lists.find(l => l.name === 'Inbox');
    
    const taskData = {
      ...parsedTask,
      list: parsedTask.list || inboxList?._id || lists[0]?._id,
      createdByAI: true
    };

    const result = await dispatch(createTask(taskData));
    
    if (createTask.fulfilled.match(result)) {
      toast.success('✨ Task created successfully!');
      handleClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (needsClarification) {
      handleContinueConversation();
    } else {
      handleParse();
    }
  };

  return (
    <Dialog open={smartInputOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        <Typography variant="h6">Smart Input</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {!llmConfigured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            LLM is not configured. Please set up your API key in Settings to use Smart Input.
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Describe your task in natural language. The AI will help you create it with all the details.
          </Typography>
        </Box>

        {/* Conversation history */}
        {conversation.length > 0 && (
          <Box sx={{ mb: 2, maxHeight: 300, overflowY: 'auto' }}>
            {conversation.map((msg, index) => (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  mb: 1,
                  bgcolor: msg.role === 'user' ? 'primary.light' : 'background.default',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        {/* Parsed task preview */}
        {parsedTask && !needsClarification && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
            <Typography variant="subtitle2" gutterBottom>
              Task Preview:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {parsedTask.title}
            </Typography>
            {parsedTask.description && (
              <Typography variant="body2" color="text.secondary">
                {parsedTask.description}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {parsedTask.priority !== 'none' && (
                <Chip label={`Priority: ${parsedTask.priority}`} size="small" />
              )}
              {parsedTask.dueDate && (
                <Chip label={`Due: ${parsedTask.dueDate}`} size="small" />
              )}
              {parsedTask.recurrence?.enabled && (
                <Chip label={`Recurring: ${parsedTask.recurrence.pattern}`} size="small" />
              )}
              {parsedTask.tags?.map(tag => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
          </Paper>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={
              needsClarification
                ? clarificationQuestion
                : 'E.g., "Create a task for having lunch every day at 6PM" or "Remind me to call mom tomorrow at 10AM"'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !llmConfigured}
            autoFocus
          />
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        
        {parsedTask && !needsClarification ? (
          <Button
            variant="contained"
            onClick={handleCreateTask}
            startIcon={<AIIcon />}
          >
            Create Task
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !input.trim() || !llmConfigured}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Processing...' : needsClarification ? 'Send' : 'Parse'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SmartInput;

