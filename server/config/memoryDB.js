// In-memory database for development
const db = {
  users: [],
  events: [],
  registrations: [],
  expenses: [],
  crowd: [],
  emergencies: []
};

let userIdCounter = 1;
let eventIdCounter = 1;
let registrationIdCounter = 1;
let expenseIdCounter = 1;

const createTable = (tableName, idCounter) => ({
  insert: (data) => {
    const records = Array.isArray(data) ? data : [data];
    const newRecords = records.map(record => ({
      id: idCounter.value++,
      created_at: new Date().toISOString(),
      ...record
    }));
    db[tableName].push(...newRecords);
    
    return {
      data: newRecords,
      error: null,
      select: () => ({ data: newRecords, error: null })
    };
  },
  
  select: (fields = '*') => ({
    eq: (field, value) => ({
      single: async () => {
        const record = db[tableName].find(r => r[field] === value);
        return { data: record || null, error: null };
      }
    })
  }),
  
  update: (updates) => ({
    eq: (field, value) => {
      const index = db[tableName].findIndex(r => r[field] === value);
      if (index !== -1) {
        db[tableName][index] = { ...db[tableName][index], ...updates };
        return { data: [db[tableName][index]], error: null };
      }
      return { data: null, error: { message: 'Not found' } };
    }
  }),
  
  delete: () => ({
    eq: (field, value) => {
      const index = db[tableName].findIndex(r => r[field] === value);
      if (index !== -1) {
        db[tableName].splice(index, 1);
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'Not found' } };
    }
  })
});

const counters = {
  users: { value: userIdCounter },
  events: { value: eventIdCounter },
  registrations: { value: registrationIdCounter },
  expenses: { value: expenseIdCounter }
};

const memoryDB = {
  from: (tableName) => {
    if (!counters[tableName]) {
      counters[tableName] = { value: 1 };
    }
    if (!db[tableName]) {
      db[tableName] = [];
    }
    return createTable(tableName, counters[tableName]);
  }
};

module.exports = memoryDB;
