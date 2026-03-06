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

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, budget, expenses')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get existing expenses array or create new
    const currentExpenses = event.expenses || [];
    
    // Add new expense
    const newExpense = {
      id: `exp_${Date.now()}`,
      item,
      amount: parseFloat(amount),
      category: category || 'general',
      added_by: user.id,
      created_at: new Date().toISOString()
    };
    
    currentExpenses.push(newExpense);
    
    // Update event with new expenses
    const { error: updateError } = await supabase
      .from('events')
      .update({ expenses: currentExpenses })
      .eq('id', event_id);
    
    if (updateError) throw updateError;

    res.status(201).json({
      message: 'Expense added successfully!',
      expense: newExpense
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

    // Get event with expenses
    const { data: event, error } = await supabase
      .from('events')
      .select('expenses')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    res.status(200).json({
      message: 'Expenses fetched successfully!',
      expenses: event?.expenses || []
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

    if (amount && amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }

    // Find event containing this expense
    const { data: events } = await supabase.from('events').select('id, expenses');
    
    let targetEvent = null;
    for (const event of events || []) {
      if (event.expenses?.some(exp => exp.id === id)) {
        targetEvent = event;
        break;
      }
    }
    
    if (!targetEvent) {
      return res.status(404).json({ message: 'Expense not found.' });
    }
    
    // Update expense
    const updatedExpenses = targetEvent.expenses.map(exp => 
      exp.id === id ? { ...exp, item: item || exp.item, amount: amount || exp.amount, category: category || exp.category } : exp
    );
    
    await supabase.from('events').update({ expenses: updatedExpenses }).eq('id', targetEvent.id);
    
    res.status(200).json({
      message: 'Expense updated successfully!',
      expense: updatedExpenses.find(exp => exp.id === id)
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

    // Find event containing this expense
    const { data: events } = await supabase.from('events').select('id, expenses');
    
    let targetEvent = null;
    for (const event of events || []) {
      if (event.expenses?.some(exp => exp.id === id)) {
        targetEvent = event;
        break;
      }
    }
    
    if (!targetEvent) {
      return res.status(404).json({ message: 'Expense not found.' });
    }
    
    // Remove expense
    const updatedExpenses = targetEvent.expenses.filter(exp => exp.id !== id);
    await supabase.from('events').update({ expenses: updatedExpenses }).eq('id', targetEvent.id);

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

    // Get event details including budget and expenses
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, budget, expenses')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get expenses from event
    const eventExpenses = event.expenses || [];

    // Calculate total spent
    const totalSpent = eventExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Calculate remaining budget
    const totalBudget = parseFloat(event.budget) || 0;
    const remaining = totalBudget - totalSpent;

    // Group expenses by category
    const byCategory = {};
    eventExpenses.forEach(exp => {
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
        total_expenses: eventExpenses.length,
        by_category: byCategory
      }
    });

  } catch (error) {
    console.error('Budget summary error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;