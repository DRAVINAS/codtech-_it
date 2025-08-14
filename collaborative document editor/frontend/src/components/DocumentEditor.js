import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const socket = io('http://localhost:5000');

function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const quillRef = useRef(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchDocument();
    setupSocketListeners();

    return () => {
      socket.emit('leave-document', { documentId: id, userId: user.id });
      socket.off('document-content');
      socket.off('document-change');
      socket.off('active-users');
      socket.off('cursor-position');
    };
  }, [id, user]);

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDocument(response.data);
      setContent(response.data.content);
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load document');
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socket.emit('join-document', { documentId: id, userId: user.id });

    socket.on('document-content', (data) => {
      setContent(data.content);
    });

    socket.on('document-change', (data) => {
      if (data.userId !== user.id) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        quill.setContents(data.change.ops);
        if (range) {
          quill.setSelection(range);
        }
      }
    });

    socket.on('active-users', (users) => {
      setActiveUsers(users);
    });

    socket.on('cursor-position', (data) => {
      // Handle cursor positions for collaborative editing
      // This would be implemented with a more sophisticated cursor tracking system
    });
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    // Emit change to other users
    socket.emit('document-change', {
      documentId: id,
      change: { ops: quillRef.current.getEditor().getContents().ops },
      userId: user.id
    });

    // Auto-save
    debounceSave(newContent);
  };

  const debounceSave = (content) => {
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
      await saveDocument(content);
    }, 1000);
  };

  const saveDocument = async (contentToSave) => {
    if (contentToSave === contentRef.current) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/documents/${id}`, {
        content: contentToSave
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/dashboard')}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {document?.title || 'Untitled Document'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeUsers.map((activeUser) => (
            <Tooltip key={activeUser.userId} title={activeUser.username}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                {activeUser.username.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
          ))}
        </Box>

        <Chip 
          label={saving ? 'Saving...' : (lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : 'Saved')}
          color={saving ? 'warning' : 'success'}
          size="small"
        />

        <IconButton onClick={() => saveDocument(content)} disabled={saving}>
          <SaveIcon />
        </IconButton>
      </Paper>

      <Box sx={{ flexGrow: 1, p: 2 }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleContentChange}
          modules={modules}
          style={{ height: 'calc(100% - 50px)' }}
        />
      </Box>
    </Box>
  );
}

export default DocumentEditor;
