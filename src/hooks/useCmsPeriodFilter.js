import { useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'thr33_cms_period_filter';
const EVENT_KEY = 'cms_period_filter_change';

// UTILITÁRIOS DE DATA
export const parseOrderDate = (order) => {
  if (!order) return null;
  const raw = order.createdAt || order.date || order.lastUpdated || order.updatedAt || order.timestamp;
  if (!raw) return null;
  if (typeof raw.toDate === 'function') return raw.toDate();
  if (raw.seconds) return new Date(raw.seconds * 1000);
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
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
