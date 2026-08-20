import { useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'thr33_cms_period_filter';
const EVENT_KEY = 'cms_period_filter_change';

// UTILITÁRIOS DE DATA
export const parseOrderDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input.toDate === 'function') return input.toDate();
  if (input.seconds) return new Date(input.seconds * 1000);
  
  let raw = input;
  if (typeof input === 'object') {
    raw = input.createdAt || input.date || input.lastUpdated || input.updatedAt || input.timestamp;
  }
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw.toDate === 'function') return raw.toDate();
  if (raw.seconds) return new Date(raw.seconds * 1000);
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const isDateInPeriod = (dateInput, period, customStart, customEnd) => {
  if (!dateInput) return false;
  if (period === 'all') return true;

  const parsed = parseOrderDate(dateInput);
  if (!parsed || isNaN(parsed.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === 'today') {
    return parsed >= startOfToday && parsed <= endOfToday;
  }
  if (period === '7days') {
    const start7DaysAgo = new Date(startOfToday);
    start7DaysAgo.setDate(start7DaysAgo.getDate() - 6);
    return parsed >= start7DaysAgo && parsed <= endOfToday;
  }
  if (period === '30days') {
    const start30DaysAgo = new Date(startOfToday);
    start30DaysAgo.setDate(start30DaysAgo.getDate() - 29);
    return parsed >= start30DaysAgo && parsed <= endOfToday;
  }
  if (period === 'custom') {
    if (!customStart || !customEnd) return true;
    const [sYear, sMonth, sDay] = String(customStart).split('-').map(Number);
    const [eYear, eMonth, eDay] = String(customEnd).split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
    const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    return parsed >= start && parsed <= end;
  }
  return true;
};

export const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDaysAgoStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatFullDateBR = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}`;
};

// Carrega do storage com fallback seguro
const loadStoredFilter = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        period: parsed.period || 'all',
        startDate: parsed.startDate || getDaysAgoStr(7),
        endDate: parsed.endDate || getTodayStr()
      };
    }
  } catch (_) {}
  return {
    period: 'all',
    startDate: getDaysAgoStr(7),
    endDate: getTodayStr()
  };
};

export function useCmsPeriodFilter() {
  const initial = loadStoredFilter();
  const [periodFilter, setPeriodFilterState] = useState(initial.period);
  const [customStartDate, setCustomStartDateState] = useState(initial.startDate);
  const [customEndDate, setCustomEndDateState] = useState(initial.endDate);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dateValidationErr, setDateValidationErr] = useState('');

  // Salva no localStorage e avisa outros componentes
  const persistFilter = useCallback((newPeriod, newStart, newEnd) => {
    try {
      const payload = {
        period: newPeriod,
        startDate: newStart,
        endDate: newEnd
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: payload }));
    } catch (_) {}
  }, []);

  const setPeriodFilter = useCallback((p) => {
    setPeriodFilterState(p);
    persistFilter(p, customStartDate, customEndDate);
  }, [customStartDate, customEndDate, persistFilter]);

  const setCustomStartDate = useCallback((s) => {
    setCustomStartDateState(s);
  }, []);

  const setCustomEndDate = useCallback((e) => {
    setCustomEndDateState(e);
  }, []);

  // Sincronização em tempo real entre abas / páginas
  useEffect(() => {
    const handleSync = (e) => {
      const data = e.detail || loadStoredFilter();
      if (data) {
        if (data.period !== undefined) setPeriodFilterState(data.period);
        if (data.startDate !== undefined) setCustomStartDateState(data.startDate);
        if (data.endDate !== undefined) setCustomEndDateState(data.endDate);
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        handleSync({ detail: loadStoredFilter() });
      }
    };

    window.addEventListener(EVENT_KEY, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_KEY, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleStartDateChange = useCallback((e) => {
    const val = e.target.value;
    setCustomStartDateState(val);
    setDateValidationErr('');
    if (val && customEndDate && val > customEndDate) {
      setCustomEndDateState(val);
      persistFilter(periodFilter, val, val);
    } else {
      persistFilter(periodFilter, val, customEndDate);
    }
  }, [customEndDate, periodFilter, persistFilter]);

  const handleEndDateChange = useCallback((e) => {
    const val = e.target.value;
    setCustomEndDateState(val);
    setDateValidationErr('');
    if (val && customStartDate && val < customStartDate) {
      setCustomStartDateState(val);
      persistFilter(periodFilter, val, val);
    } else {
      persistFilter(periodFilter, customStartDate, val);
    }
  }, [customStartDate, periodFilter, persistFilter]);

  const handleApplyCustomDate = useCallback(() => {
    if (!customStartDate || !customEndDate) {
      setDateValidationErr('Selecione a data inicial e final.');
      return;
    }
    if (customStartDate > customEndDate) {
      setDateValidationErr('Data inicial não pode ser maior que a final.');
      return;
    }
    setDateValidationErr('');
    setPeriodFilterState('custom');
    persistFilter('custom', customStartDate, customEndDate);
    setShowCustomPicker(false);
  }, [customStartDate, customEndDate, persistFilter]);

  // Rótulo do período ativo para os cabeçalhos
  const periodLabel = useMemo(() => {
    switch (periodFilter) {
      case 'today':
        return 'HOJE';
      case '7days':
        return 'ÚLTIMOS 7 DIAS';
      case '30days':
        return 'ÚLTIMOS 30 DIAS';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatFullDateBR(customStartDate)} A ${formatFullDateBR(customEndDate)}`;
        }
        return 'PERSONALIZADO';
      case 'all':
      default:
        return 'TODO O PERÍODO';
    }
  }, [periodFilter, customStartDate, customEndDate]);

  return {
    periodFilter,
    setPeriodFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    showCustomPicker,
    setShowCustomPicker,
    dateValidationErr,
    setDateValidationErr,
    handleStartDateChange,
    handleEndDateChange,
    handleApplyCustomDate,
    periodLabel,
    formatShortDate,
    formatFullDateBR,
    parseOrderDate,
    getTodayStr,
    getDaysAgoStr
  };
}
