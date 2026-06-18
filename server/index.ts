import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('NeonGrid Server is running!');
});

let clientUrl = process.env.CLIENT_URL || '*';
if (clientUrl && clientUrl.endsWith('/')) {
  clientUrl = clientUrl.slice(0, -1);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
  },
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Grid configuration (30x30 = 900 blocks)
const GRID_ROWS = 30;
const GRID_COLS = 30;
const GRID_SIZE = GRID_ROWS * GRID_COLS;
let grid = new Array(GRID_SIZE).fill(null);

// Keep track of active joined users: Map<socket.id, { color, name }>
const users = new Map<string, { color: string, name: string }>();

// Track total online connections (spectators + active players)
let onlineCount = 0;

function broadcastStats() {
  io.emit('stats_update', {
    onlineCount,
    activePlayersCount: users.size,
  });
}

io.on('connection', (socket) => {
  onlineCount++;
  console.log('User connected:', socket.id, 'Total online:', onlineCount);
  
  // Immediately send current grid state and dimensions (Spectator mode initialization)
  socket.emit('init', {
    grid,
    gridRows: GRID_ROWS,
    gridCols: GRID_COLS
  });

  // Broadcast initial stats update to the new connection and others
  broadcastStats();

  // Handle joining as a player
  socket.on('join', ({ name, color }) => {
    // Validate inputs
    const sanitizedName = (name || '').trim().substring(0, 20) || `Player ${socket.id.substring(0, 4)}`;
    const sanitizedColor = color || '#00F0FF';
    
    users.set(socket.id, { name: sanitizedName, color: sanitizedColor });
    console.log(`User ${socket.id} joined as "${sanitizedName}" with color ${sanitizedColor}`);
    
    // Confirm join to client
    socket.emit('joined', {
      userId: socket.id,
      name: sanitizedName,
      color: sanitizedColor
    });

    // Broadcast updated stats
    broadcastStats();
  });

  // Handle claiming a block
  socket.on('claim_block', (index) => {
    if (index >= 0 && index < GRID_SIZE) {
      const user = users.get(socket.id);
      if (user) {
        // Atomic update in Node event loop
        grid[index] = { owner: socket.id, color: user.color, name: user.name };
        
        // Broadcast the update to all clients
        io.emit('block_updated', {
          index,
          block: grid[index]
        });
      } else {
        // If not joined, notify client of error
        socket.emit('error_message', 'You must enter your name before claiming blocks.');
      }
    }
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    users.delete(socket.id);
    console.log('User disconnected:', socket.id, 'Total online:', onlineCount);
    
    broadcastStats();
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
