// ===================================
// CROWD MANAGEMENT ROUTES
// ===================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Helper function to get user from token
const getUserFromToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// ===================================
// ROUTE 1: UPDATE CROWD COUNT
// POST /api/crowd/update
// Protected - committee/admin only
// ===================================
router.post('/update', async (req, res) => {
  try {
    // Check if user is committee or admin
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { zone, count, event_id } = req.body;

    // Check required fields
    if (!zone || count === undefined || !event_id) {
      return res.status(400).json({ message: 'Please provide zone, count and event_id.' });
    }

    // Check if count is a valid number
    if (count < 0) {
      return res.status(400).json({ message: 'Count cannot be negative.' });
    }

    // Insert new crowd data entry
    // We insert a new row each time so we have full history
    const { data, error } = await supabase
      .from('crowd_data')
      .insert([{
        zone,
        count,
        event_id,
        timestamp: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: `Crowd count updated for zone ${zone}!`,
      crowd_data: data
    });

  } catch (error) {
    console.error('Update crowd error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 2: GET CURRENT CROWD DATA
// GET /api/crowd/current
// Public - anyone can view
// ===================================
router.get('/current', async (req, res) => {
  try {
    const { event_id } = req.query;

    // Build query
    let query = supabase
      .from('crowd_data')
      .select('*')
      .order('timestamp', { ascending: false });

    // Filter by event if provided
    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get only the latest entry for each zone
    // This gives us the CURRENT crowd count per zone
    const latestByZone = {};
    data.forEach(entry => {
      if (!latestByZone[entry.zone]) {
        latestByZone[entry.zone] = entry;
      }
    });

    // Convert to array
    const currentCrowd = Object.values(latestByZone);

    // Calculate total crowd count
    const totalCount = currentCrowd.reduce((sum, zone) => sum + zone.count, 0);

    res.status(200).json({
      message: 'Current crowd data fetched successfully!',
      total_count: totalCount,
      zones: currentCrowd
    });

  } catch (error) {
    console.error('Get crowd error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 3: GET HISTORICAL DATA FOR ZONE
// GET /api/crowd/history/:zone
// Public - anyone can view
// ===================================
router.get('/history/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const { event_id, limit } = req.query;

    // Build query
    let query = supabase
      .from('crowd_data')
      .select('*')
      .eq('zone', zone)
      .order('timestamp', { ascending: true });

    // Filter by event if provided
    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    // Limit results if provided (default 50)
    if (limit) {
      query = query.limit(parseInt(limit));
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: `No history found for zone ${zone}.` });
    }

    // Calculate some stats
    const counts = data.map(d => d.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const avgCount = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);

    res.status(200).json({
      message: `History for zone ${zone} fetched successfully!`,
      zone,
      stats: {
        max_count: maxCount,
        min_count: minCount,
        avg_count: avgCount,
        total_entries: data.length
      },
      history: data
    });

  } catch (error) {
    console.error('Get history error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;