/**
 * Socket.IO Server for Seefood Order Management
 * Handles real-time order updates without Redis dependency
 */
require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Environment variables
const PORT = process.env.PORT || 4000;
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🔧 Configuration:');
console.log(`   Environment: ${NODE_ENV}`);
console.log(`   Port: ${PORT}`);
console.log(`   CORS Origins: ${CORS_ORIGINS.join(', ')}`);
console.log('');

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());

// Socket.IO Server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Use default in-memory adapter (works across multiple clients automatically)
  transports: ['websocket', 'polling']
});

// Track connected clients
let connectedClients = 0;

// Socket.IO connection handler
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`✅ Client connected: ${socket.id} (Total: ${connectedClients})`);

  // Join the order updates room
  socket.join('order_updates');
  console.log(`📢 Client ${socket.id} joined room: order_updates`);

  // Send connection confirmation
  socket.emit('connection_established', {
    message: 'Connected to order updates',
    clientId: socket.id
  });

  // Handle ping/pong for keepalive
  socket.on('ping', (data) => {
    socket.emit('pong', {
      timestamp: data.timestamp || Date.now()
    });
    console.log(`💓 Heartbeat from ${socket.id}`);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    connectedClients--;
    console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason}, Remaining: ${connectedClients})`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`🔥 Socket error from ${socket.id}:`, error);
  });
});

// ==================== HTTP API for Django Backend ====================

/**
 * POST /broadcast/order-created
 * Called by Django when a new order is created
 */
app.post('/broadcast/order-created', (req, res) => {
  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'Order data is required' });
  }

  console.log(`📤 Broadcasting order_created: #${order.order_number}`);

  // Broadcast to all clients in the room
  io.to('order_updates').emit('order_created', {
    type: 'order_created',
    order: order
  });

  res.json({
    success: true,
    message: 'Order created event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-updated
 * Called by Django when an order is updated
 */
app.post('/broadcast/order-updated', (req, res) => {
  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'Order data is required' });
  }

  console.log(`📤 Broadcasting order_updated: #${order.order_number}`);

  io.to('order_updates').emit('order_updated', {
    type: 'order_updated',
    order: order
  });

  res.json({
    success: true,
    message: 'Order updated event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-deleted
 * Called by Django when an order is deleted
 */
app.post('/broadcast/order-deleted', (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  console.log(`📤 Broadcasting order_deleted: ID ${order_id}`);

  io.to('order_updates').emit('order_deleted', {
    type: 'order_deleted',
    order_id: order_id
  });

  res.json({
    success: true,
    message: 'Order deleted event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-status-changed
 * Called by Django when order status changes
 */
app.post('/broadcast/order-status-changed', (req, res) => {
  const { order_id, old_status, new_status, order } = req.body;

  if (!order_id || !old_status || !new_status || !order) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting order_status_changed: #${order.order_number} (${old_status} → ${new_status})`);

  io.to('order_updates').emit('order_status_changed', {
    type: 'order_status_changed',
    order_id: order_id,
    old_status: old_status,
    new_status: new_status,
    order: order
  });

  res.json({
    success: true,
    message: 'Order status changed event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-image-uploaded
 * Called by Django when an image is uploaded
 */
app.post('/broadcast/order-image-uploaded', (req, res) => {
  const { order_id, image, order } = req.body;

  if (!order_id || !image || !order) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting order_image_uploaded: Order #${order.order_number}`);

  io.to('order_updates').emit('order_image_uploaded', {
    type: 'order_image_uploaded',
    order_id: order_id,
    image: image,
    order: order
  });

  res.json({
    success: true,
    message: 'Order image uploaded event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-image-deleted
 * Called by Django when an image is deleted
 */
app.post('/broadcast/order-image-deleted', (req, res) => {
  const { order_id, image_id, order } = req.body;

  if (!order_id || !image_id || !order) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting order_image_deleted: Order #${order.order_number}`);

  io.to('order_updates').emit('order_image_deleted', {
    type: 'order_image_deleted',
    order_id: order_id,
    image_id: image_id,
    order: order
  });

  res.json({
    success: true,
    message: 'Order image deleted event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/order-assigned
 * Called by Django when users are assigned to an order
 */
app.post('/broadcast/order-assigned', (req, res) => {
  const { order_id, assigned_users, order } = req.body;

  if (!order_id || !assigned_users || !order) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting order_assigned: Order #${order.order_number}`);

  io.to('order_updates').emit('order_assigned', {
    type: 'order_assigned',
    order_id: order_id,
    assigned_users: assigned_users,
    order: order
  });

  res.json({
    success: true,
    message: 'Order assigned event broadcasted',
    clients: connectedClients
  });
});

// ==================== Comment/Chat Broadcasting ====================

/**
 * POST /broadcast/comment-created
 * Called by Django when a new comment is created
 */
app.post('/broadcast/comment-created', (req, res) => {
  const { order_id, comment } = req.body;

  if (!order_id || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting comment_created: Order #${order_id}, Comment #${comment.id}`);

  io.to('order_updates').emit('comment_created', {
    type: 'comment_created',
    order_id: order_id,
    comment: comment
  });

  res.json({
    success: true,
    message: 'Comment created event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/comment-updated
 * Called by Django when a comment is updated
 */
app.post('/broadcast/comment-updated', (req, res) => {
  const { order_id, comment } = req.body;

  if (!order_id || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting comment_updated: Order #${order_id}, Comment #${comment.id}`);

  io.to('order_updates').emit('comment_updated', {
    type: 'comment_updated',
    order_id: order_id,
    comment: comment
  });

  res.json({
    success: true,
    message: 'Comment updated event broadcasted',
    clients: connectedClients
  });
});

/**
 * POST /broadcast/comment-deleted
 * Called by Django when a comment is deleted
 */
app.post('/broadcast/comment-deleted', (req, res) => {
  const { order_id, comment_id } = req.body;

  if (!order_id || !comment_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`📤 Broadcasting comment_deleted: Order #${order_id}, Comment #${comment_id}`);

  io.to('order_updates').emit('comment_deleted', {
    type: 'comment_deleted',
    order_id: order_id,
    comment_id: comment_id
  });

  res.json({
    success: true,
    message: 'Comment deleted event broadcasted',
    clients: connectedClients
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: connectedClients,
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Socket.IO Server for Seefood Orders',
    version: '1.0.0',
    connectedClients: connectedClients
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log('\n🚀 Socket.IO Server started');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`💚 No Redis required! Using in-memory adapter\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Socket.IO server...');
  io.close(() => {
    console.log('✅ All connections closed');
    process.exit(0);
  });
});
