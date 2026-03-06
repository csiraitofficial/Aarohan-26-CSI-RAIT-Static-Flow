// ===================================
// REGISTRATION ROUTES
// ===================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const QRCode = require('qrcode');
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
// ROUTE 1: REGISTER FOR EVENT
// POST /api/registrations
// Protected - student only
// ===================================
router.post('/', async (req, res) => {
  try {
    // Get user from token
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({ message: 'Please provide event_id.' });
    }

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check if user already registered for this event
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .single();

    if (existingReg) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    // Check if event is full
    if (event.capacity) {
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact' })
        .eq('event_id', event_id);

      if (count >= event.capacity) {
        return res.status(400).json({ message: 'Event is full.' });
      }
    }

    // Create registration
    const { data: registration, error } = await supabase
      .from('registrations')
      .insert([{
        user_id: user.id,
        event_id,
        payment_status: 'pending',
        checked_in: false
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Registered for event successfully!',
      registration
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 2: GET USER'S REGISTRATIONS
// GET /api/registrations/user/:userId
// Protected - logged in user
// ===================================
router.get('/user/:userId', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    const { userId } = req.params;

    // Fetch registrations with event details
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        events (
          id,
          name,
          description,
          date,
          venue,
          status
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    res.status(200).json({
      message: 'Registrations fetched successfully!',
      registrations: data
    });

  } catch (error) {
    console.error('Get user registrations error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 3: GET EVENT REGISTRATIONS
// GET /api/registrations/event/:eventId
// Protected - committee/admin only
// ===================================
router.get('/event/:eventId', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    // Only committee or admin can see all registrations
    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { eventId } = req.params;

    // Fetch registrations with user details
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        users (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    res.status(200).json({
      message: 'Event registrations fetched successfully!',
      registrations: data
    });

  } catch (error) {
    console.error('Get event registrations error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 4: GENERATE QR CODE
// POST /api/registrations/generate-qr
// Protected - logged in user
// ===================================
router.post('/generate-qr', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    const { registration_id } = req.body;

    if (!registration_id) {
      return res.status(400).json({ message: 'Please provide registration_id.' });
    }

    // Check if registration exists
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .eq('user_id', user.id)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // Create QR code data
    // This contains all info needed to verify attendance
    const qrData = JSON.stringify({
      registration_id: registration.id,
      user_id: registration.user_id,
      event_id: registration.event_id,
      timestamp: new Date().toISOString()
    });

    // Generate QR code as base64 image
    const qrCode = await QRCode.toDataURL(qrData);

    // Save QR code to registration in Supabase
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ qr_code: qrData })
      .eq('id', registration_id);

    if (updateError) throw updateError;

    res.status(200).json({
      message: 'QR code generated successfully!',
      qr_code: qrCode  // base64 image - show this in frontend
    });

  } catch (error) {
    console.error('Generate QR error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 5: SCAN QR AND MARK ATTENDANCE
// POST /api/registrations/scan
// Protected - committee/admin only
// ===================================
router.post('/scan', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    // Only committee or admin can scan QR codes
    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ message: 'Please provide qr_data.' });
    }

    // Parse QR code data
    let parsedQR;
    try {
      parsedQR = JSON.parse(qr_data);
    } catch {
      return res.status(400).json({ message: 'Invalid QR code.' });
    }

    const { registration_id } = parsedQR;

    // Find registration
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // Check if already checked in
    if (registration.checked_in) {
      return res.status(400).json({ message: 'Student already checked in!' });
    }

    // Mark as checked in
    const { data, error } = await supabase
      .from('registrations')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString()
      })
      .eq('id', registration_id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      message: '✅ Student checked in successfully!',
      registration: data
    });

  } catch (error) {
    console.error('Scan QR error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;