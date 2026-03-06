// ===================================
// BUDGET & EXPENSES ROUTES
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
// ROUTE 1: ADD EXPENSE
// POST /api/budget/expense
// Protected - committee/admin only
// ===================================
router.post('/expense', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { event_id, item, amount, category } = req.body;

    // Check required fields
    if (!event_id || !item || !amount) {
      return res.status(400).json({ message: 'Please provide event_id, item and amount.' });
    }

    // Check if amount is valid
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, budget')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Insert expense
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        event_id,
        item,
        amount,
        category: category || 'general',
        added_by: user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Expense added successfully!',
      expense: data
    });

  } catch (error) {
    console.error('Add expense error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 2: LIST EXPENSES FOR EVENT
// GET /api/budget/expenses/:eventId
// Protected - committee/admin only
// ===================================
router.get('/expenses/:eventId', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { eventId } = req.params;

    // Fetch all expenses for this event
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      message: 'Expenses fetched successfully!',
      expenses: data
    });

  } catch (error) {
    console.error('Get expenses error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 3: UPDATE EXPENSE
// PUT /api/budget/expense/:id
// Protected - committee/admin only
// ===================================
router.put('/expense/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { id } = req.params;
    const { item, amount, category } = req.body;

    // Check if amount is valid
    if (amount && amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }

    // Update expense
    const { data, error } = await supabase
      .from('expenses')
      .update({ item, amount, category })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.status(200).json({
      message: 'Expense updated successfully!',
      expense: data
    });

  } catch (error) {
    console.error('Update expense error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 4: DELETE EXPENSE
// DELETE /api/budget/expense/:id
// Protected - committee/admin only
// ===================================
router.delete('/expense/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { id } = req.params;

    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      message: 'Expense deleted successfully!'
    });

  } catch (error) {
    console.error('Delete expense error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===================================
// ROUTE 5: GET BUDGET SUMMARY
// GET /api/budget/summary/:eventId
// Protected - committee/admin only
// ===================================
router.get('/summary/:eventId', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    if (user.role !== 'committee' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Committee or Admin only.' });
    }

    const { eventId } = req.params;

    // Get event details including budget
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, budget')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get all expenses for this event
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId);

    if (expenseError) throw expenseError;

    // Calculate total spent
    const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Calculate remaining budget
    const totalBudget = parseFloat(event.budget) || 0;
    const remaining = totalBudget - totalSpent;

    // Group expenses by category
    const byCategory = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'general';
      if (!byCategory[cat]) {
        byCategory[cat] = 0;
      }
      byCategory[cat] += parseFloat(exp.amount);
    });

    res.status(200).json({
      message: 'Budget summary fetched successfully!',
      summary: {
        event_name: event.name,
        total_budget: totalBudget,
        total_spent: totalSpent,
        remaining_budget: remaining,
        is_over_budget: totalSpent > totalBudget,
        total_expenses: expenses.length,
        by_category: byCategory
      }
    });

  } catch (error) {
    console.error('Budget summary error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;