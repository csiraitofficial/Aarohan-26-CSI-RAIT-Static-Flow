import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { emergencyAPI } from '../utils/api';

// ===================================
// EVACUATION ROUTES DATA
// ===================================
const EVACUATION_ROUTES = [
  {
    zone: 'Auditorium',
    icon: '🎭',
    color: '#6366f1',
    estimatedTime: '2 min',
    nearestExit: 'Side Emergency Doors (Left & Right)',
    assemblyPoint: 'Assembly Point A — North Lawn',
    steps: [
      'Use side emergency exits only',
      'Do NOT use main stage entrance',
      'Follow GREEN floor markings',
      'Proceed to North Lawn',
      'Wait for roll call at Assembly Point A',
    ],
  },
  {
    zone: 'Cafeteria',
    icon: '🍽️',
    color: '#f59e0b',
    estimatedTime: '1.5 min',
    nearestExit: 'Kitchen Side Door',
    assemblyPoint: 'Assembly Point B — Parking Lot',
    steps: [
      'Exit through kitchen side door',
      'Avoid main cafeteria entrance',
      'Follow ORANGE floor markings',
      'Proceed to Parking Lot',
      'Wait for roll call at Assembly Point B',
    ],
  },
  {
    zone: 'Stage',
    icon: '🎤',
    color: '#22c55e',
    estimatedTime: '1 min',
    nearestExit: 'Stage Left / Stage Right Wings',
    assemblyPoint: 'Assembly Point C — Sports Ground',
    steps: [
      'Exit stage left or right immediately',
      'Move behind backstage area',
      'Follow YELLOW floor markings',
      'Proceed to Sports Ground',
      'Wait for roll call at Assembly Point C',
    ],
  },
  {
    zone: 'Entrance',
    icon: '🚪',
    color: '#06b6d4',
    estimatedTime: '30 sec',
    nearestExit: 'Main Gate',
    assemblyPoint: 'Assembly Point D — Main Road',
    steps: [
      'Reverse through main gate calmly',
      'Do NOT block emergency vehicles',
      'Move at least 50m away from gate',
      'Spread out along Main Road',
      'Wait for roll call at Assembly Point D',
    ],
  },
];

// ===================================
// ESCALATION LEVELS
// Level 1 — Low:      Minor incident, monitor
// Level 2 — Medium:   Partial evacuation possible
// Level 3 — High:     Full evacuation recommended
// Level 4 — Critical: Immediate evacuation required
// ===================================
const ESCALATION_LEVELS = {
  1: {
    level: 1,
    label: 'Low',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.2)',
    icon: '⚠️',
    action: 'Monitor situation — No evacuation needed',
  },
  2: {
    level: 2,
    label: 'Medium',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
    icon: '🟡',
    action: 'Alert staff — Prepare for possible evacuation',
  },
  3: {
    level: 3,
    label: 'High',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.2)',
    icon: '🔴',
    action: 'Begin partial evacuation — Non-essential areas first',
  },
  4: {
    level: 4,
    label: 'Critical',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    icon: '🚨',
    action: 'IMMEDIATE FULL EVACUATION — All zones now!',
  },
};

// ===================================
// CONTEXT
// ===================================
const EmergencyContext = createContext(null);

export const EmergencyProvider = ({ children }) => {
  const [panicActive, setPanicActive] = useState(false);
  const [escalationLevel, setEscalationLevel] = useState(1);
  const [alerts, setAlerts] = useState([]);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [affectedZones, setAffectedZones] = useState([]);
  const pollRef = useRef(null);

  // Poll for active alerts every 15 seconds
  useEffect(() => {
    checkStatus();
    pollRef.current = setInterval(checkStatus, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ===================================
  // CHECK CURRENT STATUS
  // ===================================
  const checkStatus = async () => {
    try {
      const res = await emergencyAPI.getPanicStatus();
      const activeAlerts = res.data.active_alerts || [];
      setAlerts(activeAlerts);
      setLastUpdated(new Date());

      if (activeAlerts.length > 0) {
        setPanicActive(true);

        // Set escalation based on highest severity
        const hasCritical = activeAlerts.some(a => a.severity === 'critical');
        const hasHigh = activeAlerts.some(a => a.severity === 'high');
        const hasMedium = activeAlerts.some(a => a.severity === 'medium');

        if (hasCritical) setEscalationLevel(4);
        else if (hasHigh) setEscalationLevel(3);
        else if (hasMedium) setEscalationLevel(2);
        else setEscalationLevel(1);

        // Collect affected zones
        const zones = activeAlerts
          .map(a => a.location)
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i);
        setAffectedZones(zones);
      } else {
        setPanicActive(false);
        setEscalationLevel(1);
        setAffectedZones([]);
      }
    } catch (err) {
      console.error('Emergency status check failed:', err);
    }
  };

  // ===================================
  // TRIGGER PANIC
  // ===================================
  const triggerPanic = async ({
    message = 'Emergency situation detected',
    severity = 'critical',
    location = 'All Zones',
    type = 'panic',
  } = {}) => {
    setLoading(true);
    try {
      const res = await emergencyAPI.triggerPanic({ type, severity, message, location });
      const alertId = res.data?.alert?.id;
      setActiveAlertId(alertId);
      setPanicActive(true);

      // Set escalation level from severity
      const levelMap = { low: 1, medium: 2, high: 3, critical: 4 };
      setEscalationLevel(levelMap[severity] || 4);

      await checkStatus();
      return { success: true, alertId };
    } catch (err) {
      console.error('Failed to trigger panic:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  // RESOLVE PANIC
  // ===================================
  const resolvePanic = async (alertId = null) => {
    setLoading(true);
    try {
      if (alertId) {
        await emergencyAPI.resolvePanic({ alert_id: alertId });
      } else {
        await emergencyAPI.resolvePanic({ resolve_all: true });
      }

      await checkStatus();
      setActiveAlertId(null);

      // If no more alerts, reset everything
      const res = await emergencyAPI.getPanicStatus();
      if ((res.data.active_alerts || []).length === 0) {
        setPanicActive(false);
        setEscalationLevel(1);
        setAffectedZones([]);
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to resolve panic:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  // ESCALATE / DE-ESCALATE
  // ===================================
  const escalate = () => {
    setEscalationLevel(prev => Math.min(4, prev + 1));
  };

  const deEscalate = () => {
    setEscalationLevel(prev => Math.max(1, prev - 1));
  };

  // ===================================
  // GET ROUTES FOR ZONE
  // ===================================
  const getRoutesForZone = (zone) => {
    return EVACUATION_ROUTES.find(r =>
      r.zone.toLowerCase() === zone?.toLowerCase()
    ) || null;
  };

  // ===================================
  // GET ALL ROUTES
  // ===================================
  const getAllRoutes = () => EVACUATION_ROUTES;

  // ===================================
  // GET CURRENT ESCALATION INFO
  // ===================================
  const getCurrentEscalation = () => ESCALATION_LEVELS[escalationLevel];

  // ===================================
  // VALUES
  // ===================================
  const value = {
    // State
    panicActive,
    escalationLevel,
    alerts,
    activeAlertId,
    loading,
    lastUpdated,
    affectedZones,

    // Functions
    triggerPanic,
    resolvePanic,
    escalate,
    deEscalate,
    checkStatus,
    getRoutesForZone,
    getAllRoutes,
    getCurrentEscalation,

    // Data
    evacuationRoutes: EVACUATION_ROUTES,
    escalationLevels: ESCALATION_LEVELS,
    currentEscalation: ESCALATION_LEVELS[escalationLevel],
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};

// ===================================
// HOOK
// Use in any component like:
// const { panicActive, triggerPanic, resolvePanic } = useEmergency();
// ===================================
export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used inside EmergencyProvider');
  }
  return context;
};

export default EmergencyContext;