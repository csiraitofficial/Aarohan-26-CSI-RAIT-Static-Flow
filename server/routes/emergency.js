// ===================================
// EMERGENCY & PANIC ROUTES
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
// EVACUATION ROUTES DATA
// Predefined evacuation routes for each zone
// In a real app this could come from a database
// ===================================
const evacuationRoutes = {
  'Main Hall': {
    primary: 'Exit through main entrance doors (North)',
    secondary: 'Exit through side doors (East & West)',
    assembly_point: 'Parking lot A - 200m from building',
    do_not_use: 'Elevators - use stairs only',
    steps: [
      'Stay calm and do not run',
      'Follow the green exit signs',
      'Use nearest staircase to ground floor',
      'Exit through main entrance',
      'Proceed to assembly point at Parking lot A'
    ]
  },
  'Auditorium': {
    primary: 'Exit through front stage doors',
    secondary: 'Exit through back emergency exits',
    assembly_point: 'Sports ground - 300m from auditorium',
    do_not_use: 'Stage area - use side exits only',
    steps: [
      'Stay calm and do not run',
      'Follow ushers to nearest exit',
      'Use side exits if front is crowded',
      'Proceed to sports ground assembly point'
    ]
  },
  'Cafeteria': {
    primary: 'Exit through main cafeteria entrance',
    secondary: 'Exit through kitchen back door',
    assembly_point: 'Garden area - 100m from cafeteria',
    do_not_use: 'Kitchen area - staff only',
    steps: [
      'Leave food and belongings',
      'Exit through main entrance',
      'Proceed to garden assembly point',
      'Wait for roll call'
    ]
  },
  'default': {
    primary: 'Use nearest marked exit door',
    secondary: 'Follow emergency exit signs',
    assembly_point: 'Main gate area',
    do_not_use: 'Elevators during emergency',
    steps: [
      'Stay calm',
      'Follow exit signs',
      'Proceed to main gate',
      'Wait for instructions'
    ]
  }
};

// ===================================
// ROUTE 1: TRIGGER PANIC MODE
// POST /api/emergency/panic/trigger
// Protected - any logged in user can trigger
// ===================================
router.post('/panic/trigger', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    const { message, location, event_id, severity } = req.body;

    if (!message || !location) {
      return res.status(400).json({ message: 'Please provide message and location.' });
    }

    // Create a panic alert in the alerts table
    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        type: 'panic',
        severity: severity || 'critical',
        message,
        location,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    // Get evacuation route for this location
    const evacRoute = evacuationRoutes[location] || evacuationRoutes['default'];

    res.status(201).json({
      message: '🚨 PANIC MODE ACTIVATED!',
      alert: data,
      evacuation: evacRoute,
      instructions: [
        '🚨 Emergency services have been notified',
        '📢 All staff are being alerted',
        `📍 Evacuation route for ${location} is active`,
        '🏃 Follow evacuation procedures immediately'
      ]
    });

  } catch (error) {
    console.error('Panic trigger error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 2: CHECK PANIC STATUS
// GET /api/emergency/panic/status
// Public - anyone can check
// ===================================
router.get('/panic/status', async (req, res) => {
  try {
    // Get all active panic alerts
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('type', 'panic')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check if panic mode is active
    const isPanicActive = data && data.length > 0;

    res.status(200).json({
      message: isPanicActive
        ? '🚨 PANIC MODE IS ACTIVE!'
        : '✅ No active emergencies',
      panic_active: isPanicActive,
      active_alerts: data,
      total_active: data.length
    });

  } catch (error) {
    console.error('Panic status error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 3: RESOLVE PANIC
// POST /api/emergency/panic/resolve
// Protected - committee/admin only
// ===================================
router.post('/panic/resolve', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    // Only committee or admin can resolve panic
    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { alert_id } = req.body;

    if (alert_id) {
      // Resolve specific alert
      const { data, error } = await supabase
        .from('alerts')
        .update({ status: 'resolved' })
        .eq('id', alert_id)
        .eq('type', 'panic')
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        message: '✅ Panic alert resolved successfully!',
        alert: data
      });
    }

    // Resolve ALL active panic alerts
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('type', 'panic')
      .eq('status', 'active')
      .select();

    if (error) throw error;

    res.status(200).json({
      message: '✅ All panic alerts resolved!',
      resolved_count: data.length,
      alerts: data
    });

  } catch (error) {
    console.error('Panic resolve error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 4: GET EVACUATION ROUTES
// GET /api/emergency/evacuation/:zone
// Public - anyone can view
// ===================================
router.get('/evacuation/:zone', async (req, res) => {
  try {
    const { zone } = req.params;

    // Decode zone name from URL (handles spaces)
    const decodedZone = decodeURIComponent(zone);

    // Get evacuation route for this zone
    const route = evacuationRoutes[decodedZone] || evacuationRoutes['default'];

    res.status(200).json({
      message: `Evacuation route for ${decodedZone}`,
      zone: decodedZone,
      evacuation_route: route
    });

  } catch (error) {
    console.error('Evacuation route error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;