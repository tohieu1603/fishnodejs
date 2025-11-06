# Socket.IO Server for Seefood Orders

Realtime order updates server using Socket.IO - **No Redis required!**

## Features

- ✅ **No Redis dependency** - Uses Socket.IO's built-in memory adapter
- ✅ **Multi-client support** - Works with multiple browsers/tabs simultaneously
- ✅ **HTTP API** - Django backend calls HTTP endpoints to broadcast events
- ✅ **Heartbeat/Keepalive** - Built-in ping/pong mechanism
- ✅ **Reconnection** - Socket.IO handles reconnection automatically

## Installation

```bash
cd socketio-server
npm install
```

## Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server will start on `http://localhost:4000`

## Architecture

```
Frontend (Next.js)
    ↕ Socket.IO Client
Socket.IO Server (Port 4000) ← No Redis needed!
    ↕ HTTP POST
Django Backend (Port 8000)
```

## API Endpoints

### WebSocket
- `ws://localhost:4000` - Socket.IO connection endpoint

### HTTP Endpoints (for Django)

#### POST /broadcast/order-created
```json
{
  "order": { ... }
}
```

#### POST /broadcast/order-updated
```json
{
  "order": { ... }
}
```

#### POST /broadcast/order-deleted
```json
{
  "order_id": "123"
}
```

#### POST /broadcast/order-status-changed
```json
{
  "order_id": "123",
  "old_status": "created",
  "new_status": "weighing",
  "order": { ... }
}
```

#### POST /broadcast/order-image-uploaded
```json
{
  "order_id": "123",
  "image": { ... },
  "order": { ... }
}
```

#### POST /broadcast/order-image-deleted
```json
{
  "order_id": "123",
  "image_id": "456",
  "order": { ... }
}
```

#### POST /broadcast/order-assigned
```json
{
  "order_id": "123",
  "assigned_users": [...],
  "order": { ... }
}
```

#### GET /health
Health check endpoint

#### GET /
Server info

## Events Emitted to Clients

All events are emitted to the `order_updates` room:

- `connection_established` - On client connect
- `order_created` - New order created
- `order_updated` - Order updated
- `order_deleted` - Order deleted
- `order_status_changed` - Order status changed
- `order_image_uploaded` - Image uploaded
- `order_image_deleted` - Image deleted
- `order_assigned` - Users assigned to order
- `pong` - Response to ping (keepalive)

## Environment Variables

- `PORT` - Server port (default: 4000)

## Why Socket.IO instead of plain WebSocket?

1. **No Redis required** for multiple clients (unlike Django Channels)
2. **Built-in reconnection** - automatic retry on connection loss
3. **Fallback support** - HTTP long-polling if WebSocket fails
4. **Easier room management** - Built-in room/namespace support
5. **Better browser compatibility**

## Troubleshooting

### Port 4000 already in use
```bash
# Find and kill process
lsof -ti:4000 | xargs kill -9

# Or use a different port
PORT=4001 npm start
```

### CORS errors
Update the `origin` array in `server.js` to include your frontend URL.

### Connection timeout
Check that firewall allows port 4000, or that frontend is connecting to correct URL.
