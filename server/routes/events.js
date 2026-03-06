// ===================================
// EVENTS ROUTES
// ===================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyCommittee } = require('../middleware/auth');

// ===================================
// ROUTE 1: GET ALL EVENTS
// GET /api/events
// Public - anyone can view events
// ===================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      message: 'Events fetched successfully!',
      events: data
    });

  } catch (error) {
    console.error('Get events error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 2: GET SINGLE EVENT
// GET /api/events/:id
// Public - anyone can view an event
// ===================================
router.get('/:id', async (req, res) => {
  try {
    // Get event id from URL params
    const { id } = req.params;

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({
      message: 'Event fetched successfully!',
      event: data
    });

  } catch (error) {
    console.error('Get event error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 3: CREATE EVENT
// POST /api/events
// Protected - committee/admin only
// ===================================
router.post('/', async (req, res) => {
  try {
    // Check if user is committee or admin
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'committee' && decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    // Get event details from request body
    const { name, description, date, venue, capacity, budget, status } = req.body;

    // Check required fields
    if (!name || !date) {
      return res.status(400).json({ message: 'Please provide event name and date.' });
    }

    // Insert event into Supabase
    const { data, error } = await supabase
      .from('events')
      .insert([{
        name,
        description,
        date,
        venue,
        capacity,
        budget,
        status: status || 'upcoming'
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Event created successfully!',
      event: data[0]
    });

  } catch (error) {
    console.error('Create event error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 4: UPDATE EVENT
// PUT /api/events/:id
// Protected - committee/admin only
// ===================================
router.put('/:id', async (req, res) => {
  try {
    // Check if user is committee or admin
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'committee' && decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { id } = req.params;
    const { name, description, date, venue, capacity, budget, status } = req.body;

    // Update event in Supabase
    const { data, error } = await supabase
      .from('events')
      .update({
        name,
        description,
        date,
        venue,
        capacity,
        budget,
        status
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({
      message: 'Event updated successfully!',
      event: data[0]
    });

  } catch (error) {
    console.error('Update event error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 5: DELETE EVENT
// DELETE /api/events/:id
// Protected - committee/admin only
// ===================================
router.delete('/:id', async (req, res) => {
  try {
    // Check if user is committee or admin
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'committee' && decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { id } = req.params;

    // Delete event from Supabase
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      message: 'Event deleted successfully!'
    });

  } catch (error) {
    console.error('Delete event error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;