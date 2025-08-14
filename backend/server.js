const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read', 'write'], default: 'write' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
});

const Document = mongoose.model('Document', documentSchema);

// Change Schema for tracking edits
const changeSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  change: { type: Object, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Change = mongoose.model('Change', changeSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ username, email, password: hashedPassword });
    console.log('User registration attempt:', { username, email });

    console.log('User registration attempt:', { username, email });

    console.log('User registration attempt:', { username, email });

    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const document = new Document({ title, owner: req.user.userId });
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user.userId },
        { 'collaborators.user': req.user.userId }
      ]
    }).populate('owner', 'username');
    res.json(documents);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username')
      .populate('collaborators.user', 'username');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const hasAccess = document.owner._id.equals(req.user.userId) ||
      document.collaborators.some(c => c.user._id.equals(req.user.userId));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(document);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO for real-time collaboration
const activeUsers = new Map();
const documentRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-document', async (data) => {
    const { documentId, userId } = data;
    
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      const hasAccess = document.owner.equals(userId) ||
        document.collaborators.some(c => c.user.equals(userId));
      
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(documentId);
      
      if (!activeUsers.has(documentId)) {
        activeUsers.set(documentId, new Map());
      }
      
      const user = await User.findById(userId);
      activeUsers.get(documentId).set(socket.id, {
        userId: user._id,
        username: user.username
      });

      // Send current document content
      socket.emit('document-content', {
        content: document.content,
        version: document.version
      });

      // Notify other users
      socket.to(documentId).emit('user-joined', {
        userId: user._id,
        username: user.username
      });

      // Send active users list
      io.to(documentId).emit('active-users', 
        Array.from(activeUsers.get(documentId).values())
      );
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('document-change', async (data) => {
    const { documentId, change, userId } = data;
    
    try {
      // Save change to database
      const changeDoc = new Change({
        documentId,
        userId,
        change
      });
      await changeDoc.save();

      // Update document
      const document = await Document.findById(documentId);
      if (document) {
        document.content = change.content || document.content;
        document.version += 1;
        document.updatedAt = new Date();
        await document.save();
      }

      // Broadcast change to other users in the room
      socket.to(documentId).emit('document-change', {
        change,
        userId,
        version: document.version
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('cursor-position', (data) => {
    const { documentId, position, userId } = data;
    socket.to(documentId).emit('cursor-position', {
      userId,
      position,
      socketId: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all rooms
    activeUsers.forEach((users, documentId) => {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);
        
        socket.to(documentId).emit('user-left', {
          userId: user.userId,
          username: user.username
        });
        
        io.to(documentId).emit('active-users', 
          Array.from(users.values())
        );
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
