"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFastQuery, mutate } from '../lib/swr';
import { useAuth } from '../context/AuthContext';
import SingleVisitModal from '../components/SingleVisitModal';
import Link from 'next/link';
import {
  UserGroupIcon,
  TicketIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

function categoryLabel(category: string, type: string) {
  if (category === 'subscription') return 'اشتراك جديد';
  if (category === 'renewal') return 'تجديد اشتراك';
  if (category === 'single_visit') return 'زيارة مفردة';
  if (category === 'sales' || category === 'store') return 'مبيعات متجر';
  if (category === 'coach_salary') return 'راتب كابتن';
  if (type === 'expense') return 'مصروف';
  return 'معاملة';
}

function categoryColor(category: string, type: string) {
  if (category === 'subscription' || category === 'renewal') return '#8b5cf6';
  if (category === 'single_visit') return '#06b6d4';
  if (category === 'sales' || category === 'store') return '#f59e0b';
  if (type === 'expense') return '#ef4444';
  return '#22c55e';
}

function categoryDot(category: string, type: string) {
  const c = categoryColor(category, type);
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%',
      background: c, flexShrink: 0,
      boxShadow: `0 0 6px ${c}99`
    }} />
  );
}

// ─── Mini SVG Chart ────────────────────────────────────────────────────────────

function MiniChart({ data1, data2 }: { data1: number[]; data2: number[] }) {
  const W = 400, H = 110, PAD = 10;
  const max = Math.max(...data1, ...data2, 1);

  const toPath = (arr: number[]) => {
    const xs = arr.map((_, i) => PAD + (i / (arr.length - 1)) * (W - PAD * 2));
    const ys = arr.map(v => H - PAD - (v / max) * (H - PAD * 2));
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  };

  const toArea = (arr: number[]) => {
    const xs = arr.map((_, i) => PAD + (i / (arr.length - 1)) * (W - PAD * 2));
    const ys = arr.map(v => H - PAD - (v / max) * (H - PAD * 2));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' L');
    return `M${xs[0]},${H - PAD} L${pts} L${xs[xs.length - 1]},${H - PAD} Z`;
  };

  const labels = ['01', '05', '10', '15', '20', '21'];

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <line key={r} x1={PAD} y1={H - PAD - r * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - r * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Area fills */}
      <path d={toArea(data2)} fill="url(#grad2)" />
      <path d={toArea(data1)} fill="url(#grad1)" />
      {/* Lines */}
      <path d={toPath(data2)} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      <path d={toPath(data1)} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
      {/* Last point dot */}
      {(() => {
        const i = data1.length - 1;
        const x = PAD + (i / (data1.length - 1)) * (W - PAD * 2);
        const y = H - PAD - (data1[i] / max) * (H - PAD * 2);
        return <circle cx={x} cy={y} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth="1.5" />;
      })()}
      {/* X labels */}
      {labels.map((lbl, i) => {
        const x = PAD + (i / (labels.length - 1)) * (W - PAD * 2);
        return (
          <text key={lbl} x={x} y={H + 16} textAnchor="middle"
            fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Cairo, sans-serif">{lbl}</text>
        );
      })}
    </svg>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const router = useRouter();
  const { cashier } = useAuth();
  const [showSingleVisitModal, setShowSingleVisitModal] = useState(false);
  const [nowStr, setNowStr] = useState('');

  // Live clock
  useEffect(() => {
    const update = () => {
      setNowStr(new Date().toLocaleString('ar-EG', {
        timeZone: 'Africa/Cairo',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // Data fetching
  const { data: statsData, mutate: mutateStats } = useFastQuery('/reports/dashboard');
  const { data: attData,   mutate: mutateAtt   } = useFastQuery('/attendance/stats');
  const { data: payData,   mutate: mutatePay   } = useFastQuery('/payments/dashboard');
  const { data: membersData } = useFastQuery('/members?limit=5&sort=-createdAt');
  const { data: txData      } = useFastQuery('/transactions?limit=5');

  const stats    = statsData      || {};
  const attStats = attData?.stats || {};
  const payStats = payData?.data  || {};

  const recentMembers      = Array.isArray(membersData?.members) ? membersData.members : [];
  const recentTransactions = Array.isArray(txData?.transactions)  ? txData.transactions  :
                             Array.isArray(txData)                 ? txData                : [];

  const loadAll = () => { mutateStats(); mutateAtt(); mutatePay(); };

  // Greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'صباح النشاط' : hour < 17 ? 'مساء الإنتاجية' : 'مساء النشاط';
  const firstName = cashier?.name?.split(' ')[0] || '';

  // Shift badge
  const shiftColor = cashier?.shiftType === 'GIRLS' ? { bg: 'rgba(236,72,153,0.15)', color: '#ec4899', border: 'rgba(236,72,153,0.3)', label: 'GIRLS' }
                   : cashier?.shiftType === 'BOYS'  ? { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', border: 'rgba(59,130,246,0.3)',  label: 'BOYS'  }
                   : null;

  // KPI Cards
  const kpiCards = [
    {
      label: 'إجمالي الأعضاء',
      value: (stats?.totalMembers || 0).toLocaleString('ar-EG'),
      sub: 'عضو مسجل',
      trend: 12,
      icon: <UserGroupIcon />,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.2)',
    },
    {
      label: 'الاشتراكات النشطة',
      value: (stats?.activeSubscriptions || 0).toLocaleString('ar-EG'),
      sub: 'اشتراك نشط',
      trend: 8.2,
      icon: <TicketIcon />,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.2)',
    },
    {
      label: 'إيرادات الشهر',
      value: (payStats?.thisMonthRevenue || 0).toLocaleString('ar-EG'),
      sub: 'ج.م',
      trend: -16.4,
      icon: <BanknotesIcon />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.2)',
    },
    {
      label: 'حضور اليوم',
      value: (attStats?.today || stats?.todayAttendance || 0).toLocaleString('ar-EG'),
      sub: `${stats?.activeNow || 0} داخل الجيم الآن`,
      trend: null,
      icon: <ClipboardDocumentCheckIcon />,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.12)',
      border: 'rgba(6,182,212,0.2)',
    },
  ];

  // Fake cumulative chart data (replace with real monthly data if available)
  const days = 21;
  const buildCumulative = (base: number, growth: number) =>
    Array.from({ length: days }, (_, i) => Math.round(base * ((i + 1) / days) + growth * Math.random() * 0.3));
  const thisMonthData = buildCumulative(payStats?.thisMonthRevenue || 128000, 5000);
  const lastMonthData = buildCumulative((payStats?.thisMonthRevenue || 128000) * 0.85, 3000);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page" style={{ padding: 0 }}>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.01)',
        backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Left: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* WhatsApp status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#22c55e',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            واتساب متصل
          </div>
          {/* Bell */}
          <button style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, width: 36, height: 36, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', color: 'var(--text-muted)',
          }}>
            <BellIcon style={{ width: 18, height: 18 }} />
            {(stats?.expiringSoon || 0) > 0 && (
              <span style={{
                position: 'absolute', top: 6, left: 6, width: 8, height: 8,
                background: '#ef4444', borderRadius: '50%', border: '1.5px solid var(--bg-dark)',
              }} />
            )}
          </button>
          {/* Shift badge */}
          {shiftColor && (
            <span style={{
              background: shiftColor.bg, color: shiftColor.color,
              border: `1px solid ${shiftColor.border}`,
              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
            }}>{shiftColor.label}</span>
          )}
          {cashier?.role === 'admin' && !shiftColor && (
            <span style={{
              background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
            }}>ADMIN</span>
          )}
        </div>
        {/* Right: title + date */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>الرئيسية</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{nowStr} · توقيت القاهرة</div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 32px' }}>

        {/* Welcome + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/attendance')}
              style={{
                background: 'rgba(6,182,212,0.12)', color: '#06b6d4',
                border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10,
                padding: '10px 18px', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <QrCodeIcon style={{ width: 16, height: 16 }} />
              تسجيل حضور
            </button>
            <button
              onClick={() => router.push('/members')}
              style={{
                background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10,
                padding: '10px 18px', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <UserPlusIcon style={{ width: 16, height: 16 }} />
              + إضافة عضو
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              {greeting}، {firstName} 👋
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              إليك نظرة على أداء الجيم اليوم. كل شيء تحت السيطرة.
            </p>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          {kpiCards.map((card) => (
            <div key={card.label} style={{
              background: 'linear-gradient(135deg,#1c1c1e,#1f1f24)',
              border: `1px solid ${card.border}`,
              borderRadius: 16, padding: '20px 20px 16px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px ${card.color}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              {/* bg glow */}
              <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, background: card.color, opacity: 0.06, borderRadius: '50%', filter: 'blur(20px)' }} />
              {/* header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</span>
                  {card.trend !== null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: card.trend > 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {card.trend > 0 ? <ArrowTrendingUpIcon style={{ width: 12 }} /> : <ArrowTrendingDownIcon style={{ width: 12 }} />}
                      {card.trend > 0 ? '+' : ''}{card.trend}% مقارنة بالشهر الماضي
                    </span>
                  )}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: card.bg, color: card.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {React.cloneElement(card.icon as React.ReactElement, { style: { width: 20, height: 20 } })}
                </div>
              </div>
              {/* value */}
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: card.color, marginTop: 6, fontWeight: 600 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Middle Row: Quick Actions + Expiring | Chart ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Quick Actions card */}
            <div style={{
              background: 'linear-gradient(135deg,#1c1c1e,#1f1f24)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>ابدأ من هنا</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>إدارة أسرع لأكثر الاحتياجات</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => router.push('/members')}
                  style={{
                    flex: 1, background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10,
                    padding: '10px 0', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <UserPlusIcon style={{ width: 16 }} />
                  عضو جديد
                </button>
                <button
                  onClick={() => router.push('/attendance')}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: '10px 0', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <QrCodeIcon style={{ width: 16 }} />
                  مسح QR
                </button>
              </div>
            </div>

            {/* Expiring Soon warning card */}
            <div
              onClick={() => router.push('/expiring-soon')}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 16, padding: 20, cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(245,158,11,0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(245,158,11,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(245,158,11,0.08)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ExclamationTriangleIcon style={{ width: 20, color: '#f59e0b' }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>
                  {stats?.expiringSoon || 0} اشتراكاً تنتهي قريباً
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.75)', margin: '0 0 14px' }}>
                أعضاء تنتهي اشتراكاتهم خلال 7 أيام
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>
                عرض قائمة التجديدات
                <ArrowLeftIcon style={{ width: 14 }} />
              </div>
            </div>

            {/* Single visit quick button */}
            <button
              onClick={() => setShowSingleVisitModal(true)}
              style={{
                background: 'rgba(6,182,212,0.08)', color: '#67e8f9',
                border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12,
                padding: '12px 16px', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%',
              }}
            >
              <SparklesIcon style={{ width: 16 }} />
              حصة فردية (Single Visit)
            </button>
          </div>

          {/* Chart card */}
          <div style={{
            background: 'linear-gradient(135deg,#1c1c1e,#1f1f24)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ width: 24, height: 2, background: '#8b5cf6', borderRadius: 2 }} />
                  نوفمبر 2026
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ width: 24, height: 2, background: '#06b6d4', borderRadius: 2, opacity: 0.7, backgroundImage: 'repeating-linear-gradient(90deg, #06b6d4 0 4px, transparent 4px 7px)' }} />
                  أكتوبر 2026
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>نمو الإيرادات التراكمي</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>إجمالي الإيرادات الشهرية</div>
              </div>
            </div>
            <MiniChart data1={thisMonthData} data2={lastMonthData} />
            {/* Y-axis hint */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 10px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>0</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>150k</span>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Recent Members | Recent Activities ────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Recent Members */}
          <div style={{
            background: 'linear-gradient(135deg,#1c1c1e,#1f1f24)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' }}>
              <Link href="/members" style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                عرض الكل <ArrowLeftIcon style={{ width: 12 }} />
              </Link>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>أحدث الأعضاء</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['الحالة', 'تاريخ الانضمام', 'الباقة', 'العضو'].map(h => (
                    <th key={h} style={{ padding: '8px 20px', textAlign: 'right', fontSize: 11, color: '#606070', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMembers.length > 0 ? recentMembers.map((m: any) => (
                  <tr key={m._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(139,92,246,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>نشط</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(m.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {m.currentSubscription?.plan?.name || 'باقة الاشتراك الشهرية'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{m.name}</span>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                        }}>
                          {m.name?.charAt(0) || '؟'}
                        </div>
                      </div>
                    </td>
                  </tr>
                )) : (
                  // Skeleton / empty
                  [1, 2, 3, 4].map(i => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {[1, 2, 3, 4].map(j => (
                        <td key={j} style={{ padding: '14px 20px' }}>
                          <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, width: j === 4 ? 120 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Activities */}
          <div style={{
            background: 'linear-gradient(135deg,#1c1c1e,#1f1f24)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Link href="/payments" style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                عرض الكل <ArrowLeftIcon style={{ width: 12 }} />
              </Link>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>آخر النشاطات</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentTransactions.length > 0 ? recentTransactions.map((tx: any, idx: number) => (
                <div key={tx._id || idx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0', borderBottom: idx < recentTransactions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  {categoryDot(tx.category, tx.type)}
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {categoryLabel(tx.category, tx.type)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tx.customerName || tx.description || '—'}
                      {tx.amount ? ` · ج.م ${tx.amount.toLocaleString('ar-EG')}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#404050', flexShrink: 0 }}>
                    {tx.date ? timeAgo(tx.date) : ''}
                  </div>
                </div>
              )) : (
                // placeholder rows
                [
                  { color: '#8b5cf6', title: 'اشتراك جديد', sub: 'باقة الوفاء · ج.م 350', time: 'منذ 5 دقائق' },
                  { color: '#f59e0b', title: 'دفعة مستلمة', sub: 'ج.م 850 · نقدي', time: 'منذ 12 دقيقة' },
                  { color: '#22c55e', title: 'تسجيل حضور', sub: 'مسح QR', time: 'منذ 18 دقيقة' },
                  { color: '#3b82f6', title: 'تجديد اشتراك', sub: '1 شهر', time: 'منذ 24 دقيقة' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${item.color}99` }} />
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#404050', flexShrink: 0 }}>{item.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Single Visit Modal */}
      <SingleVisitModal
        open={showSingleVisitModal}
        onClose={() => setShowSingleVisitModal(false)}
        onSuccess={() => loadAll()}
      />
    </div>
  );
};

export default Dashboard;
