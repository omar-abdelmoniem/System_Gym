'use client';

import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { getLocalDateString } from '../../lib/qrUtils';
import ConfirmModal from '../../components/ConfirmModal';
import {
  BanknotesIcon,
  ReceiptRefundIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  UserGroupIcon,
  UsersIcon,
  DocumentCheckIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  ClockIcon,
  ShoppingBagIcon,
  TrashIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORY_LABELS: Record<string, string> = {
  subscription: 'ط§ط´طھط±ط§ظƒط§طھ ط£ط¹ط¶ط§ط،',
  single_visit: 'ط­طµطµ ظپط±ط¯ظٹط© (Day Pass)',
  renewal: 'طھط¬ط¯ظٹط¯ ط§ط´طھط±ط§ظƒط§طھ',
  coach_salary: 'ط±ظˆط§طھط¨ ظƒط¨ط§طھظ†',
  rent: 'ط¥ظٹط¬ط§ط±',
  equipment: 'ظ…ط¹ط¯ط§طھ ط§ظ„ط¬ظٹظ…',
  electricity: 'ظƒظ‡ط±ط¨ط§ط،',
  water: 'ظ…ظٹط§ظ‡',
  maintenance: 'طµظٹط§ظ†ط©',
  salaries: 'ط±ظˆط§طھط¨ ط¹ظ…ط§ظ„ط©',
  marketing: 'طھط³ظˆظٹظ‚',
  store: 'ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط±',
  sales: 'ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط±',
  other: 'ط£ط®ط±ظ‰',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'ظƒط§ط´',
  CARD: 'ط¨ط·ط§ظ‚ط©',
  BANK_TRANSFER: 'طھط­ظˆظٹظ„ ط¨ظ†ظƒظٹ',
  ONLINE: 'ط£ظˆظ†ظ„ط§ظٹظ†',
  OTHER: 'ط£ط®ط±ظ‰',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'ظ†ط´ط·',
  expired: 'ظ…ظ†طھظ‡ظٹ',
  cancelled: 'ظ…ظ„ط؛ظٹ',
  frozen: 'ظ…ط¬ظ…ط¯',
  PAID: 'ظ…ط¯ظپظˆط¹ ط¨ط§ظ„ظƒط§ظ…ظ„',
  PARTIAL: 'ظ…ط¯ظپظˆط¹ ط¬ط²ط¦ظٹط§ظ‹',
  PENDING: 'ظ…ط¹ظ„ظ‚',
};

const ARABIC_MONTHS = [
  '', 'ظٹظ†ط§ظٹط±', 'ظپط¨ط±ط§ظٹط±', 'ظ…ط§ط±ط³', 'ط¥ط¨ط±ظٹظ„', 'ظ…ط§ظٹظˆ', 'ظٹظˆظ†ظٹظˆ',
  'ظٹظˆظ„ظٹظˆ', 'ط£ط؛ط³ط·ط³', 'ط³ط¨طھظ…ط¨ط±', 'ط£ظƒطھظˆط¨ط±', 'ظ†ظˆظپظ…ط¨ط±', 'ط¯ظٹط³ظ…ط¨ط±',
];

// â”€â”€â”€ Shared Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  bgGradient?: string;
}

const StatCard = ({
  label, value, sub, color = 'var(--text)', icon, bgGradient = 'rgba(255,255,255,0.05)'
}: StatCardProps) => (
  <div className="stat-card" style={{
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    borderRadius: '16px',
    background: 'var(--bg-card)',
    border: `1px solid ${color ? `${color}33` : 'var(--border-color)'}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.25s ease'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div className="stat-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
        {label}
      </div>
      {icon && (
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: bgGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color || '#fff',
          boxShadow: `0 4px 14px ${color ? `${color}25` : 'rgba(0,0,0,0.1)'}`
        }}>
          {React.cloneElement(icon as React.ReactElement, { style: { width: '22px', height: '22px' } })}
        </div>
      )}
    </div>

    <div className="stat-value" style={{ color: color || 'var(--text)', fontSize: '26px', fontWeight: 'bold' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
      {sub && <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 'normal' }}>{sub}</span>}
    </div>
  </div>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="form-card" style={{ marginBottom: '20px' }}>
    <h3 style={{ marginBottom: '14px' }}>{title}</h3>
    {children}
  </div>
);

// â”€â”€â”€ Daily Bar Chart (CSS only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DailyChart = ({ data }: { data: { day: number; income: number; expense: number }[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', minWidth: `${data.length * 22}px` }}>
        {data.map(d => (
          <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '18px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100px', gap: '1px' }}>
              <div title={`ط¥ظٹط±ط§ط¯: ${d.income} ط¬.ظ…`} style={{ background: 'var(--primary)', height: `${Math.round((d.income / maxVal) * 90)}px`, borderRadius: '2px 2px 0 0', minHeight: d.income > 0 ? '4px' : '0' }} />
              <div title={`ظ…طµط±ظˆظپ: ${d.expense} ط¬.ظ…`} style={{ background: 'var(--danger)', height: `${Math.round((d.expense / maxVal) * 90)}px`, borderRadius: '0 0 2px 2px', minHeight: d.expense > 0 ? '4px' : '0', opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{d.day}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
        <span><span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px', display: 'inline-block', marginLeft: '4px' }} />ط¥ظٹط±ط§ط¯ط§طھ</span>
        <span><span style={{ width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '2px', display: 'inline-block', marginLeft: '4px' }} />ظ…طµط±ظˆظپط§طھ</span>
      </div>
    </div>
  );
};

import { useAuth } from '../../context/AuthContext';

// â”€â”€â”€ Daily Report Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DailyReportPanel = () => {
  const { cashier } = useAuth();
  const todayStr = getLocalDateString();
  const [date, setDate] = useState(todayStr);
  const [shiftFilter, setShiftFilter] = useState(cashier?.shiftType || '');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const loadDailyReport = async (d: string, sFilter?: string) => {
    try {
      setLoading(true);
      setError('');
      const targetShift = sFilter !== undefined ? sFilter : shiftFilter;
      const { data } = await api.get('/reports/daily', {
        params: { date: d, shiftType: targetShift || undefined }
      });
      setReport(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ط­ط¯ط« ط®ط·ط£');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteSale = async () => {
    if (!saleToDelete) return;
    const saleId = saleToDelete;
    setDeletingId(saleId);
    setSaleToDelete(null);
    try {
      await api.delete(`/sales/${saleId}`);
      await loadDailyReport(date, shiftFilter);
    } catch (err: any) {
      setError('ط®ط·ط£ ظپظٹ ط§ظ„ط­ط°ظپ: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { loadDailyReport(todayStr); }, [shiftFilter]); // eslint-disable-line

  return (
    <div>
      {/* Date & Shift Picker */}
      <div className="form-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px' }}>ظپظ„طھط±ط© ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ظٹظˆظ…ظٹ</h3>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div>
            <label>ط§ظ„طھط§ط±ظٹط®</label>
            <input type="date" value={date} max={todayStr} onChange={e => setDate(e.target.value)} />
          </div>

          {cashier?.role === 'admin' ? (
            <div>
              <label>ط§ظ„ط´ظپطھ</label>
              <select value={shiftFilter} onChange={e => { setShiftFilter(e.target.value); loadDailyReport(date, e.target.value); }}>
                <option value="">ًںŒگ ط¬ظ…ظٹط¹ ط§ظ„ط´ظپطھط§طھ</option>
                <option value="GIRLS">ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ</option>
                <option value="BOYS">ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨</option>
              </select>
            </div>
          ) : (
            <div>
              <label>ط§ظ„ط´ظپطھ ط§ظ„ط­ط§ظ„ظٹ</label>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                {cashier?.shiftType === 'GIRLS' ? 'ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ' : cashier?.shiftType === 'BOYS' ? 'ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨' : 'ظƒط§ط´ظٹط±'}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => loadDailyReport(date)}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.35)',
                fontWeight: 600,
                padding: '9px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              <MagnifyingGlassIcon style={{ width: '16px', height: '16px' }} />
              {loading ? 'ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...' : 'ط¹ط±ط¶ ط§ظ„طھظ‚ط±ظٹط±'}
            </button>
          </div>
          <div>
            <button
              onClick={() => { setDate(todayStr); loadDailyReport(todayStr); }}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: '10px',
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <CalendarDaysIcon style={{ width: '16px', height: '16px' }} />
              ط§ظ„ظٹظˆظ…
            </button>
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginTop: '10px' }}>{error}</div>}
      </div>

      {report && (
        <>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>طھظ‚ط±ظٹط± ظٹظˆظ… {new Date(report.date + 'T12:00:00').toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            {report.shiftType ? (
              <div style={{ marginTop: '6px' }}>
                <span className="badge badge-secondary" style={{ fontSize: '12px', color: report.shiftType === 'GIRLS' ? '#ec4899' : '#3b82f6' }}>
                  {report.shiftType === 'GIRLS' ? 'ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ' : 'ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨'}
                </span>
              </div>
            ) : (
              <div style={{ marginTop: '6px' }}>
                <span className="badge badge-secondary" style={{ fontSize: '12px' }}>ًںŒگ ط¬ظ…ظٹط¹ ط§ظ„ط´ظپطھط§طھ</span>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="cards-grid" style={{ marginBottom: '24px' }}>
            <StatCard 
              label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ" 
              value={report.financial.totalIncome} 
              sub="ط¬.ظ…" 
              color="#22c55e" 
              bgGradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))"
              icon={<BanknotesIcon />} 
            />
            <StatCard 
              label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…طµط±ظˆظپط§طھ" 
              value={report.financial.totalExpense} 
              sub="ط¬.ظ…" 
              color="#ef4444" 
              bgGradient="linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))"
              icon={<ReceiptRefundIcon />} 
            />
            <StatCard
              label="طµط§ظپظٹ ط§ظ„ط±ط¨ط­"
              value={report.financial.netProfit}
              sub="ط¬.ظ…"
              color={report.financial.netProfit >= 0 ? '#10b981' : '#ef4444'}
              bgGradient={report.financial.netProfit >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))'}
              icon={report.financial.netProfit >= 0 ? <ArrowTrendingUpIcon /> : <ArrowTrendingDownIcon />}
            />
            <StatCard 
              label="ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط±" 
              value={report.sales?.count || 0} 
              sub={`${(report.sales?.revenue || 0).toLocaleString()} ط¬.ظ…`} 
              color="#60a5fa" 
              bgGradient="linear-gradient(135deg, rgba(96,165,250,0.25), rgba(96,165,250,0.08))"
              icon={<ShoppingBagIcon />} 
            />
            <StatCard 
              label="ط­طµطµ ظپط±ط¯ظٹط© (Day Pass)" 
              value={report.singleVisits?.count || 0} 
              sub={`${(report.singleVisits?.revenue || 0).toLocaleString()} ط¬.ظ…`} 
              color="#f59e0b" 
              bgGradient="linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))"
              icon={<SparklesIcon />} 
            />
            <StatCard 
              label="ط­ط¶ظˆط± ط§ظ„ط£ط¹ط¶ط§ط،" 
              value={report.attendance.totalVisits} 
              color="#3b82f6"
              bgGradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))"
              icon={<UserGroupIcon />} 
            />
            <StatCard 
              label="ط£ط¹ط¶ط§ط، ظ…ط®طھظ„ظپظٹظ†" 
              value={report.attendance.uniqueVisitors} 
              color="#8b5cf6"
              bgGradient="linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))"
              icon={<UsersIcon />} 
            />
            <StatCard 
              label="ط§ط´طھط±ط§ظƒط§طھ ط¬ط¯ظٹط¯ط©" 
              value={report.subscriptions.count} 
              color="#06b6d4"
              bgGradient="linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.08))"
              icon={<DocumentCheckIcon />} 
            />
            <StatCard 
              label="ط£ط¹ط¶ط§ط، ط¬ط¯ط¯" 
              value={report.newMembers.count} 
              color="#ec4899"
              bgGradient="linear-gradient(135deg, rgba(236,72,153,0.25), rgba(236,72,153,0.08))"
              icon={<UserPlusIcon />} 
            />
            <StatCard 
              label="ظ…ط¯ظپظˆط¹ط§طھ ظ…ط³ط¬ظ„ط©" 
              value={report.settledPayments.count} 
              color="#10b981"
              bgGradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.08))"
              icon={<CheckBadgeIcon />} 
            />
          </div>

          {/* Income & Expense Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <SectionCard title="ظ…طµط§ط¯ط± ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ">
              {Object.keys(report.incomeByCategory).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط¥ظٹط±ط§ط¯ط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ظ…طµط¯ط±</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th></tr></thead>
                  <tbody>
                    {Object.entries(report.incomeByCategory as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => (
                        <tr key={cat}>
                          <td>{CATEGORY_LABELS[cat] || cat}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{amt.toLocaleString()} ط¬.ظ…</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="ط§ظ„ظ…طµط±ظˆظپط§طھ">
              {Object.keys(report.expenseByCategory).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ظ…طµط±ظˆظپط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ظپط¦ط©</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th></tr></thead>
                  <tbody>
                    {Object.entries(report.expenseByCategory as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => (
                        <tr key={cat}>
                          <td>{CATEGORY_LABELS[cat] || cat}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{amt.toLocaleString()} ط¬.ظ…</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

          {/* â”€â”€ Settled Payments (ط³ط¯ط§ط¯ ط§ظ„ظ…ط¹ظ„ظ‚) â”€â”€ */}
          <SectionCard title="ط§ظ„ظ…ط¨ط§ظ„ط؛ ط§ظ„ظ…ظڈط³ط¯ط¯ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…">
            {report.settledPayments.list.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ظ…ط¯ظپظˆط¹ط§طھ ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ط§ظ„ط¹ط¶ظˆ</th>
                      <th>ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ</th>
                      <th>ط§ظ„ظ…ط¯ظپظˆط¹</th>
                      <th>ط§ظ„ظ…طھط¨ظ‚ظٹ</th>
                      <th>ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹</th>
                      <th>ط§ظ„ط­ط§ظ„ط©</th>
                      <th>ظˆظ‚طھ ط§ظ„ط³ط¯ط§ط¯</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.settledPayments.list.map((p: any) => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 'bold' }}>{(p.member as any)?.name || '-'}</td>
                        <td>{p.amount.toLocaleString()} ط¬.ظ…</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{p.paidAmount.toLocaleString()} ط¬.ظ…</td>
                        <td style={{ color: p.remainingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {p.remainingAmount.toLocaleString()} ط¬.ظ…
                        </td>
                        <td>{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                        <td>
                          <span className={`badge ${p.status === 'PAID' ? 'badge-success' : p.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(p.paymentDate).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* â”€â”€ Single Visits (ط­طµطµ ظپط±ط¯ظٹط©) â”€â”€ */}
          {report.singleVisits && (
            <SectionCard title={`ط§ظ„ط­طµطµ ط§ظ„ظپط±ط¯ظٹط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ… (${report.singleVisits.count}) â€” ط¥ط¬ظ…ط§ظ„ظٹ: ${report.singleVisits.revenue.toLocaleString()} ط¬.ظ…`}>
              {report.singleVisits.list.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط­طµطµ ظپط±ط¯ظٹط© ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ط§ط³ظ… ط§ظ„ط²ط§ط¦ط± / ط§ظ„ظ„ط§ط¹ط¨</th>
                        <th>ظ†ظˆط¹ ط§ظ„ط­طµط©</th>
                        <th>ط§ظ„ظ…ظˆط¨ط§ظٹظ„</th>
                        <th>ط§ظ„ظ…ط¨ظ„ط؛</th>
                        <th>ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹</th>
                        <th>ط§ظ„ط´ظپطھ</th>
                        <th>ظˆظ‚طھ ط§ظ„ط¯ط®ظˆظ„</th>
                        <th>ط§ظ„ظƒط§ط´ظٹط±</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.singleVisits.list.map((v: any) => (
                        <tr key={v._id}>
                          <td style={{ fontWeight: 'bold' }}>{v.name}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              {v.sessionName || 'ط­طµط© ط¹ط§ظ…ط©'}
                            </span>
                          </td>
                          <td>{v.phone || <span style={{ color: 'var(--text-muted)' }}>ط¨ط¯ظˆظ† ط±ظ‚ظ…</span>}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{v.amount.toLocaleString()} ط¬.ظ…</td>
                          <td>{METHOD_LABELS[v.paymentMethod] || v.paymentMethod}</td>
                          <td>
                            <span className="badge badge-secondary" style={{
                              color: v.shiftType === 'GIRLS' ? '#ec4899' : '#3b82f6',
                              background: v.shiftType === 'GIRLS' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)'
                            }}>
                              {v.shiftType === 'GIRLS' ? 'ًںŒ¸ ط¨ظ†ط§طھ' : 'ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ط¨ط§ط¨'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            {new Date(v.visitedAt || v.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>{v.createdBy?.name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* â”€â”€ Store Sales (ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط±) â”€â”€ */}
          {report.sales && (
            <SectionCard title={`ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط± ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ… (${report.sales.count}) â€” ط¥ط¬ظ…ط§ظ„ظٹ: ${report.sales.revenue.toLocaleString()} ط¬.ظ…`}>
              {report.sales.list.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ظ…ط¨ظٹط¹ط§طھ ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ط§ظ„ظˆظ‚طھ</th>
                        <th>ط§ظ„ظ…ظ†طھط¬ط§طھ</th>
                        <th>ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ</th>
                        <th>ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹</th>
                        <th>ط§ظ„ظƒط§ط´ظٹط±</th>
                        <th>ط¥ط¬ط±ط§ط،</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sales.list.map((s: any) => (
                        <tr key={s._id}>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(s.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {s.items.map((item: any, idx: number) => (
                                <div key={idx} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>أ—{item.quantity}</span>
                                  <span>{item.name}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>({item.price} ط¬.ظ…)</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: '#22c55e', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{s.total.toLocaleString()} ط¬.ظ…</td>
                          <td>{s.paymentMethod === 'card' ? 'ط¨ط·ط§ظ‚ط©' : s.paymentMethod === 'CARD' ? 'ط¨ط·ط§ظ‚ط©' : 'ظƒط§ط´'}</td>
                          <td style={{ fontSize: '12px' }}>{s.cashier?.name || '-'}</td>
                          <td>
                            <button
                              onClick={() => setSaleToDelete(s._id)}
                              disabled={deletingId === s._id}
                              style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171',
                                borderRadius: 8,
                                padding: '5px 10px',
                                cursor: deletingId === s._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontFamily: 'Cairo, sans-serif',
                                fontWeight: 700,
                                opacity: deletingId === s._id ? 0.5 : 1,
                              }}
                            >
                              <TrashIcon style={{ width: 13, height: 13 }} />
                              {deletingId === s._id ? '...' : 'ط­ط°ظپ'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* All Transactions */}
          <SectionCard title={`ط¬ظ…ظٹط¹ ط§ظ„ظ…ط¹ط§ظ…ظ„ط§طھ (${report.transactions.length})`}>
            {report.transactions.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ظ…ط¹ط§ظ…ظ„ط§طھ</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ط§ظ„ظˆظ‚طھ</th>
                      <th>ط§ظ„ظ†ظˆط¹</th>
                      <th>ط§ظ„طھطµظ†ظٹظپ</th>
                      <th>ط§ظ„ط¹ط¶ظˆ / ط§ظ„ط²ط§ط¦ط± / ط§ظ„ظƒط§ط¨طھظ†</th>
                      <th>ط§ظ„ظ…ط¨ظ„ط؛</th>
                      <th>ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹</th>
                      <th>ظ…ظ„ط§ط­ط¸ط§طھ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((tx: any) => (
                      <tr key={tx._id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(tx.date).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 'bold', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                          {tx.type === 'income' ? 'ط¥ظٹط±ط§ط¯' : 'ظ…طµط±ظˆظپ'}
                        </td>
                        <td>{CATEGORY_LABELS[tx.category] || tx.category}</td>
                        <td>{(tx.memberId as any)?.name || tx.customerName || (tx.coachId as any)?.name || tx.description || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                          {tx.amount.toLocaleString()} ط¬.ظ…
                        </td>
                        <td>{METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.description || tx.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Attendance */}
          {report.attendance.list.length > 0 && (
            <SectionCard title={`ط§ظ„ط­ط¶ظˆط± (${report.attendance.totalVisits} ط²ظٹط§ط±ط© â€” ${report.attendance.uniqueVisitors} ط¹ط¶ظˆ ظ…ط®طھظ„ظپ)`}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>ط§ظ„ط¹ط¶ظˆ</th><th>ط¯ط®ظˆظ„</th><th>ط®ط±ظˆط¬</th><th>ط§ظ„ط·ط±ظٹظ‚ط©</th></tr>
                  </thead>
                  <tbody>
                    {report.attendance.list.map((a: any) => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 'bold' }}>{(a.member as any)?.name || '-'}</td>
                        <td>{new Date(a.checkInTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ color: a.checkOutTime ? 'var(--text)' : 'var(--text-muted)' }}>
                          {a.checkOutTime ? new Date(a.checkOutTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'ظ„ظ… ظٹط³ط¬ظ„ ط®ط±ظˆط¬'}
                        </td>
                        <td>{a.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Subscriptions */}
          {report.subscriptions.list.length > 0 && (
            <SectionCard title={`ط§ظ„ط§ط´طھط±ط§ظƒط§طھ ط§ظ„ط¬ط¯ظٹط¯ط© (${report.subscriptions.count})`}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>ط§ظ„ط¹ط¶ظˆ</th><th>ط§ظ„ط®ط·ط©</th><th>ظ…ظ†</th><th>ط¥ظ„ظ‰</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th></tr>
                  </thead>
                  <tbody>
                    {report.subscriptions.list.map((s: any) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 'bold' }}>{(s.member as any)?.name || '-'}</td>
                        <td>{(s.plan as any)?.name || '-'}</td>
                        <td>{new Date(s.startDate).toLocaleDateString('ar-EG')}</td>
                        <td>{new Date(s.endDate).toLocaleDateString('ar-EG')}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{s.pricePaid.toLocaleString()} ط¬.ظ…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* New Members */}
          {report.newMembers.count > 0 && (
            <SectionCard title={`ط£ط¹ط¶ط§ط، ط¬ط¯ط¯ (${report.newMembers.count})`}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.newMembers.list.map((m: any) => (
                  <div key={m._id} style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>{m.name}</strong> â€” {m.phone}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Confirm Delete Sale Modal */}
      <ConfirmModal
        open={!!saleToDelete}
        type="danger"
        title="طھط£ظƒظٹط¯ ط­ط°ظپ ط¹ظ…ظ„ظٹط© ط§ظ„ط¨ظٹط¹"
        message={
          <span>
            ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط¹ظ…ظ„ظٹط© ط§ظ„ط¨ظٹط¹ ظ‡ط°ظ‡طں
            <br />
            <span style={{ fontSize: '13px', opacity: 0.85, color: '#f87171', display: 'block', marginTop: '6px' }}>
              ط³ظٹطھظ… ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ظƒظ…ظٹط§طھ ظ„ظ„ظ…ط®ط²ظˆظ† ظˆط®طµظ… ط§ظ„ظ…ط¨ظ„ط؛ ظ…ظ† ط§ظ„ط¥ظٹط±ط§ط¯.
            </span>
          </span>
        }
        confirmText="ظ†ط¹ظ…طŒ ط§ط­ط°ظپ"
        cancelText="ط¥ظ„ط؛ط§ط،"
        onConfirm={handleConfirmDeleteSale}
        onCancel={() => setSaleToDelete(null)}
      />
    </div>
  );
};

// â”€â”€â”€ Monthly Report Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MonthlyReportPanel = () => {
  const { cashier } = useAuth();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shiftFilter, setShiftFilter] = useState(cashier?.shiftType || '');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runReport = async (sFilter?: string) => {
    try {
      setLoading(true);
      setError('');
      const targetShift = sFilter !== undefined ? sFilter : shiftFilter;
      const { data } = await api.get('/reports/monthly', {
        params: { year, month, shiftType: targetShift || undefined }
      });
      setReport(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¬ظ„ط¨ ط§ظ„طھظ‚ط±ظٹط±');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Picker */}
      <div className="form-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '14px' }}>ظپظ„طھط±ط© ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط´ظ‡ط±ظٹ</h3>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div>
            <label>ط§ظ„ط³ظ†ط©</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label>ط§ظ„ط´ظ‡ط±</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {ARABIC_MONTHS.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          {cashier?.role === 'admin' ? (
            <div>
              <label>ط§ظ„ط´ظپطھ</label>
              <select value={shiftFilter} onChange={e => { setShiftFilter(e.target.value); runReport(e.target.value); }}>
                <option value="">ًںŒگ ط¬ظ…ظٹط¹ ط§ظ„ط´ظپطھط§طھ</option>
                <option value="GIRLS">ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ</option>
                <option value="BOYS">ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨</option>
              </select>
            </div>
          ) : (
            <div>
              <label>ط§ظ„ط´ظپطھ ط§ظ„ط­ط§ظ„ظٹ</label>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                {cashier?.shiftType === 'GIRLS' ? 'ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ' : cashier?.shiftType === 'BOYS' ? 'ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨' : 'ظƒط§ط´ظٹط±'}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => runReport()}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.35)',
                fontWeight: 600,
                padding: '9px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              <MagnifyingGlassIcon style={{ width: '16px', height: '16px' }} />
              {loading ? 'ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...' : 'ط¹ط±ط¶ ط§ظ„طھظ‚ط±ظٹط±'}
            </button>
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginTop: '10px' }}>{error}</div>}
      </div>

      {report && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>
              طھظ‚ط±ظٹط± ط´ظ‡ط± {ARABIC_MONTHS[report.period.month]} {report.period.year}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {report.period.daysInMonth} ظٹظˆظ…
              {report.shiftType ? (
                <span className="badge badge-secondary" style={{ marginRight: '8px', fontSize: '12px', color: report.shiftType === 'GIRLS' ? '#ec4899' : '#3b82f6' }}>
                  {report.shiftType === 'GIRLS' ? 'ًںŒ¸ ط´ظپطھ ط§ظ„ط¨ظ†ط§طھ' : 'ًںڈ‹ï¸ڈâ€چâ™‚ï¸ڈ ط´ظپطھ ط§ظ„ط´ط¨ط§ط¨'}
                </span>
              ) : (
                <span className="badge badge-secondary" style={{ marginRight: '8px', fontSize: '12px' }}>ًںŒگ ط¬ظ…ظٹط¹ ط§ظ„ط´ظپطھط§طھ</span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="cards-grid" style={{ marginBottom: '24px' }}>
            <StatCard 
              label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ" 
              value={report.financial.totalIncome} 
              sub="ط¬.ظ…" 
              color="#22c55e" 
              bgGradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))"
              icon={<BanknotesIcon />} 
            />
            <StatCard 
              label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…طµط±ظˆظپط§طھ" 
              value={report.financial.totalExpense} 
              sub="ط¬.ظ…" 
              color="#ef4444" 
              bgGradient="linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))"
              icon={<ReceiptRefundIcon />} 
            />
            <StatCard 
              label="طµط§ظپظٹ ط§ظ„ط±ط¨ط­" 
              value={report.financial.netProfit} 
              sub="ط¬.ظ…"
              color={report.financial.netProfit >= 0 ? '#10b981' : '#ef4444'}
              bgGradient={report.financial.netProfit >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))'}
              icon={report.financial.netProfit >= 0 ? <ArrowTrendingUpIcon /> : <ArrowTrendingDownIcon />} 
            />
            <StatCard 
              label="ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…طھط¬ط±" 
              value={report.sales?.count || 0} 
              sub={`${(report.sales?.revenue || 0).toLocaleString()} ط¬.ظ…`} 
              color="#60a5fa" 
              bgGradient="linear-gradient(135deg, rgba(96,165,250,0.25), rgba(96,165,250,0.08))"
              icon={<ShoppingBagIcon />} 
            />
            <StatCard 
              label="ط­طµطµ ظپط±ط¯ظٹط© (Day Pass)" 
              value={report.singleVisits?.count || 0} 
              sub={`${(report.singleVisits?.revenue || 0).toLocaleString()} ط¬.ظ…`} 
              color="#f59e0b" 
              bgGradient="linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))"
              icon={<SparklesIcon />} 
            />
            <StatCard 
              label="ط£ط¹ط¶ط§ط، ط¬ط¯ط¯" 
              value={report.members.newCount} 
              color="#ec4899" 
              bgGradient="linear-gradient(135deg, rgba(236,72,153,0.25), rgba(236,72,153,0.08))"
              icon={<UserPlusIcon />} 
            />
            <StatCard 
              label="ط§ط´طھط±ط§ظƒط§طھ ط¬ط¯ظٹط¯ط©" 
              value={report.subscriptions.count} 
              color="#06b6d4" 
              bgGradient="linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.08))"
              icon={<DocumentCheckIcon />} 
            />
            <StatCard 
              label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط²ظٹط§ط±ط§طھ" 
              value={report.attendance.totalVisits} 
              color="#3b82f6" 
              bgGradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))"
              icon={<UserGroupIcon />} 
            />
            <StatCard 
              label="ط²ظˆط§ط± ظپط±ظٹط¯ظˆظ†" 
              value={report.attendance.uniqueVisitors} 
              color="#8b5cf6" 
              bgGradient="linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))"
              icon={<UsersIcon />} 
            />
          </div>

          {/* Daily Chart */}
          <SectionCard title="ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ ظˆط§ظ„ظ…طµط±ظˆظپط§طھ ط§ظ„ظٹظˆظ…ظٹط©">
            <DailyChart data={report.dailyChart} />
          </SectionCard>

          {/* Income & Expense */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <SectionCard title="ظ…طµط§ط¯ط± ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ">
              {Object.keys(report.incomeByCategory).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط¥ظٹط±ط§ط¯ط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ظ…طµط¯ط±</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th></tr></thead>
                  <tbody>
                    {Object.entries(report.incomeByCategory as Record<string, number>).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                      <tr key={cat}>
                        <td>{CATEGORY_LABELS[cat] || cat}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{amt.toLocaleString()} ط¬.ظ…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
            <SectionCard title="طھظپطµظٹظ„ ط§ظ„ظ…طµط±ظˆظپط§طھ">
              {Object.keys(report.expenseByCategory).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ظ…طµط±ظˆظپط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ظپط¦ط©</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th></tr></thead>
                  <tbody>
                    {Object.entries(report.expenseByCategory as Record<string, number>).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                      <tr key={cat}>
                        <td>{CATEGORY_LABELS[cat] || cat}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{amt.toLocaleString()} ط¬.ظ…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

          {/* Top Payers + Sub breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <SectionCard title="ط£ط¹ظ„ظ‰ 5 ط£ط¹ط¶ط§ط، ط¯ظپط¹ط§ظ‹">
              {!report.topPayers || report.topPayers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>#</th><th>ط§ظ„ط¹ط¶ظˆ</th><th>ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ</th></tr></thead>
                  <tbody>
                    {report.topPayers.map((p: any, i: number) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{p.total.toLocaleString()} ط¬.ظ…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
            <SectionCard title="ط­ط§ظ„ط© ط§ظ„ط§ط´طھط±ط§ظƒط§طھ">
              <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                ط¥ظٹط±ط§ط¯ ط§ظ„ط§ط´طھط±ط§ظƒط§طھ: <strong style={{ color: 'var(--success)' }}>{report.subscriptions.revenue.toLocaleString()} ط¬.ظ…</strong>
              </div>
              {Object.keys(report.subscriptions.statusBreakdown).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط§ط´طھط±ط§ظƒط§طھ</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ط­ط§ظ„ط©</th><th>ط§ظ„ط¹ط¯ط¯</th></tr></thead>
                  <tbody>
                    {Object.entries(report.subscriptions.statusBreakdown as Record<string, number>).map(([status, count]) => (
                      <tr key={status}>
                        <td><span className={`badge ${status === 'active' ? 'badge-success' : status === 'expired' ? 'badge-danger' : 'badge-warning'}`}>{STATUS_LABELS[status] || status}</span></td>
                        <td style={{ fontWeight: 'bold' }}>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

          {/* Coach Salaries */}
          <SectionCard title="ط±ظˆط§طھط¨ ط§ظ„ظƒط¨ط§طھظ†">
            <div style={{ display: 'flex', gap: '24px', marginBottom: '14px', flexWrap: 'wrap', fontSize: '13px' }}>
              <span>ط§ظ„ظ…ط³طھط­ظ‚: <strong style={{ color: 'var(--warning)' }}>{report.coachSalaries.totalDue.toLocaleString()} ط¬.ظ…</strong></span>
              <span>ط§ظ„ظ…ط¯ظپظˆط¹: <strong style={{ color: 'var(--success)' }}>{report.coachSalaries.totalPaid.toLocaleString()} ط¬.ظ…</strong></span>
              <span>ط§ظ„ظ…طھط¨ظ‚ظٹ: <strong style={{ color: 'var(--danger)' }}>{(report.coachSalaries.totalDue - report.coachSalaries.totalPaid).toLocaleString()} ط¬.ظ…</strong></span>
            </div>
            {report.coachSalaries.list.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>ظ„ط§ طھظˆط¬ط¯ ط±ظˆط§طھط¨</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ظƒط§ط¨طھظ†</th><th>ط§ظ„ظ…ط³طھط­ظ‚</th><th>ط§ظ„ظ…ط¯ظپظˆط¹</th><th>ط§ظ„ظ…طھط¨ظ‚ظٹ</th><th>ط§ظ„ط­ط§ظ„ط©</th></tr></thead>
                  <tbody>
                    {report.coachSalaries.list.map((cs: any) => (
                      <tr key={cs._id}>
                        <td style={{ fontWeight: 'bold' }}>{cs.coach?.name || '-'}</td>
                        <td>{cs.salaryAmount.toLocaleString()} ط¬.ظ…</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{cs.paidAmount.toLocaleString()} ط¬.ظ…</td>
                        <td style={{ color: cs.remainingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{cs.remainingAmount.toLocaleString()} ط¬.ظ…</td>
                        <td><span className={`badge ${cs.status === 'PAID' ? 'badge-success' : cs.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{STATUS_LABELS[cs.status] || cs.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* New Members */}
          {report.members.newCount > 0 && (
            <SectionCard title={`ط§ظ„ط£ط¹ط¶ط§ط، ط§ظ„ط¬ط¯ط¯ (${report.members.newCount})`}>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ط§ط³ظ…</th><th>ط§ظ„ظ‡ط§طھظپ</th><th>طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„</th></tr></thead>
                  <tbody>
                    {report.members.list.map((m: any) => (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 'bold' }}>{m.name}</td>
                        <td>{m.phone}</td>
                        <td>{new Date(m.createdAt).toLocaleDateString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Subscriptions List */}
          {report.subscriptions.list.length > 0 && (
            <SectionCard title={`ط§ظ„ط§ط´طھط±ط§ظƒط§طھ ط§ظ„ظ…ط³ط¬ظ„ط© (${report.subscriptions.count})`}>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>ط§ظ„ط¹ط¶ظˆ</th><th>ط§ظ„ط®ط·ط©</th><th>ظ…ظ†</th><th>ط¥ظ„ظ‰</th><th>ط§ظ„ظ…ط¨ظ„ط؛</th><th>ط§ظ„ط­ط§ظ„ط©</th></tr></thead>
                  <tbody>
                    {report.subscriptions.list.map((s: any) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 'bold' }}>{(s.member as any)?.name || '-'}</td>
                        <td>{(s.plan as any)?.name || '-'}</td>
                        <td>{new Date(s.startDate).toLocaleDateString('ar-EG')}</td>
                        <td>{new Date(s.endDate).toLocaleDateString('ar-EG')}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{s.pricePaid.toLocaleString()} ط¬.ظ…</td>
                        <td><span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'expired' ? 'badge-danger' : 'badge-warning'}`}>{STATUS_LABELS[s.status] || s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
};

// â”€â”€â”€ Main Reports Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Reports = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('daily')}
            style={{
              background: activeTab === 'daily'
                ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.12))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              color: activeTab === 'daily' ? '#fbbf24' : 'var(--text-muted)',
              border: activeTab === 'daily' ? '1px solid rgba(245,158,11,0.45)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '9px 18px',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: activeTab === 'daily' ? '0 2px 12px rgba(245,158,11,0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CalendarDaysIcon style={{ width: '16px', height: '16px' }} />
            طھظ‚ط±ظٹط± ظٹظˆظ…ظٹ
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              background: activeTab === 'monthly'
                ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.12))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              color: activeTab === 'monthly' ? '#818cf8' : 'var(--text-muted)',
              border: activeTab === 'monthly' ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '9px 18px',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: activeTab === 'monthly' ? '0 2px 12px rgba(99,102,241,0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <ChartBarSquareIcon style={{ width: '16px', height: '16px' }} />
            طھظ‚ط±ظٹط± ط´ظ‡ط±ظٹ
          </button>
        </div>
        <h1>ط§ظ„طھظ‚ط§ط±ظٹط±</h1>
      </div>

      {activeTab === 'daily'   && <DailyReportPanel />}
      {activeTab === 'monthly' && <MonthlyReportPanel />}
    </div>
  );
};

export default Reports;

