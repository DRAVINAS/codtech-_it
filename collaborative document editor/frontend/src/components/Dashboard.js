import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import PersonIcon from '@mui/icons-material/Person';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load documents');
      setLoading(false);
    }
  };

  const createDocument = async () => {
    if (!newDocumentTitle.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/documents', {
        title: newDocumentTitle
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDocuments([response.data, ...documents]);
      setNewDocumentTitle('');
      setOpenDialog(false);
      navigate(`/document/${response.data._id}`);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create document');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Welcome, {user?.username}!
        </Typography>
        <Button variant="outlined" onClick={logout}>
          Logout
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        Your Documents
      </Typography>

      <Grid container spacing={3}>
        {documents.map((doc) => (
          <Grid item xs={12} sm={6} md={4} key={doc._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {doc.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created: {formatDate(doc.createdAt)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Updated: {formatDate(doc.updatedAt)}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Chip 
                    label={doc.owner.username === user?.username ? 'Owner' : 'Collaborator'}
                    size="small"
                    color={doc.owner.username === user?.username ? 'primary' : 'default'}
                  />
                  
                  {doc.collaborators && doc.collaborators.length > 0 && (
                    <Chip 
                      label={`${doc.collaborators.length} collaborators`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>
              
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/document/${doc._id}`)}
                >
                  Edit
                </Button>
                
                <Button 
                  size="small" 
                  startIcon={<ShareIcon />}
                  onClick={() => console.log('Share functionality to be implemented')}
                >
                  Share
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            fullWidth
            variant="outlined"
            value={newDocumentTitle}
            onChange={(e) => setNewDocumentTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createDocument();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={createDocument} disabled={!newDocumentTitle.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
