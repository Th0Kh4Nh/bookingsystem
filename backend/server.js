const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ===== MIDDLEWARE =====
// CORS Setup
app.use(cors());

// JSON Body Parser
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ===== MONGODB CONNECTION =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ===== MONGOOSE SCHEMA & MODEL =====
const bookingSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  pitchName: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: 'Đã đặt'
  }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

// ===== ROUTES =====

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Create a Booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { customerName, pitchName, startTime, endTime, status } = req.body;

    // Validate required fields
    if (!customerName || !pitchName || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const booking = new Booking({
      customerName,
      pitchName,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status || 'Đã đặt'
    });

    const savedBooking = await booking.save();
    console.log(`Booking created: ${savedBooking._id}`);
    res.status(201).json(savedBooking);
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});


// Get All Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Cancel a Booking by ID
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log(`Booking deleted: ${id}`);
    res.json({ message: 'Booking cancelled successfully', booking: deletedBooking });
  } catch (error) {
    console.error('Error deleting booking:', error.message);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ===== ERROR HANDLING MIDDLEWARE =====
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});


// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

module.exports = app;