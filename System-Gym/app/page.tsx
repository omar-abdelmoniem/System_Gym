"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useFastQuery } from '../lib/swr';
import SingleVisitModal from '../components/SingleVisitModal';
import { BellIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const router = useRouter();
  const { cashier } = useAuth();
  const [showSingleVisitModal, setShowSingleVisitModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState({
    dateStr: 'السبت، 21 نوفمبر 2026',
    timeStr: '10:42 ص · توقيت القاهرة',
  });

  // Query live API data with graceful fallbacks to the exact mockup numbers
  const { data: statsData, mutate: mutateStats } = useFastQuery('/reports/dashboard');
  const { data: attData, mutate: mutateAtt } = useFastQuery('/attendance/stats');
  const { data: payData, mutate: mutatePay } = useFastQuery('/payments/dashboard');
  const { data: membersData } = useFastQuery('/members?limit=4&sort=-createdAt');
  const { data: txData } = useFastQuery('/transactions?limit=4');

  const stats = statsData || {};
  const attStats = attData?.stats || {};
  const payStats = payData?.data || {};

  // Formatted KPI Numbers
  const totalMembersVal = (stats?.totalMembers ?? 1248).toLocaleString();
  const activeSubsVal = (stats?.activeSubscriptions ?? 1086).toLocaleString();
  const monthRevVal = (payStats?.thisMonthRevenue ?? 128450).toLocaleString();
  const todayAttVal = (attStats?.today ?? stats?.todayAttendance ?? 156).toLocaleString();
  const activeNowVal = stats?.activeNow ?? 42;
  const expiringVal = stats?.expiringSoon ?? 24;

  const firstName = cashier?.name ? cashier.name.split(' ')[0] : 'أحمد';

  // Real-time clock update (Cairo time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('ar-EG', {
        timeZone: 'Africa/Cairo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('ar-EG', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentDateTime({
        dateStr: datePart,
        timeStr: `${timePart} · توقيت القاهرة`,
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = () => {
    mutateStats();
    mutateAtt();
    mutatePay();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0d14', color: '#f3f4f6', direction: 'rtl' }}>

      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        {/* Right side: Page Title */}
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', margin: 0 }}>الرئيسية</h1>

        {/* Left side: Status indicators & Cairo time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Shift badge */}
          <span style={{
            background: cashier?.shiftType === 'GIRLS' ? '#3d1a2d' : '#1d2c47',
            color: cashier?.shiftType === 'GIRLS' ? '#f472b6' : '#60a5fa',
            border: `1px solid ${cashier?.shiftType === 'GIRLS' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'}`,
            borderRadius: 8,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px'
          }}>
            {cashier?.shiftType || 'BOYS'}
          </span>

          {/* Notification Bell with red counter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/expiring-soon')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c90a4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                cursor: 'pointer'
              }}
            >
              <BellIcon style={{ width: 20, height: 20 }} />
            </button>
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 10,
              padding: '1px 5px',
              lineHeight: '1.2'
            }}>
              3
            </span>
          </div>

          {/* WhatsApp Connected Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 20,
            padding: '5px 14px',
            color: '#22c55e',
            fontSize: 12,
            fontWeight: 700
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e'
            }} />
            واتساب متصل
          </div>

          {/* Cairo Time */}
          <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, color: '#8c90a4' }}>{currentDateTime.dateStr}</div>
            <div style={{ fontSize: 11, color: '#55586d' }}>{currentDateTime.timeStr}</div>
          </div>
        </div>
      </header>

      {/* ─── Main Content Body ──────────────────────────────────────────────── */}
      <main style={{ padding: '28px 36px 40px' }}>

        {/* ── 1. Welcome Row with Buttons ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              صباح النشاط، {firstName} 👋
            </div>
            <div style={{ fontSize: 13, color: '#8c90a4', marginTop: 4 }}>
              إليك نظرة على أداء الجيم اليوم. كل شيء تحت السيطرة.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/members')}
              style={{
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 22px',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              + إضافة عضو
            </button>
            <button
              onClick={() => router.push('/attendance')}
              style={{
                background: '#202330',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              تسجيل حضور
            </button>
          </div>
        </div>

        {/* ── 2. KPI Cards Row (4 cards) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24
        }}>
          {/* Card 1: إجمالي الأعضاء */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '22px 24px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>إجمالي الأعضاء</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
              <span style={{ width: 3, height: 26, background: '#6366f1', borderRadius: 2 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{totalMembersVal}</div>
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              ↑ 12% مقارنة بالشهر الماضي
            </div>
          </div>

          {/* Card 2: الاشتراكات النشطة */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '22px 24px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>الاشتراكات النشطة</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
              <span style={{ width: 3, height: 26, background: '#6366f1', borderRadius: 2 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{activeSubsVal}</div>
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              ↑ 8.2% مقارنة بالشهر الماضي
            </div>
          </div>

          {/* Card 3: إيرادات الشهر */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '22px 24px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>إيرادات الشهر</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
              <span style={{ width: 3, height: 26, background: '#6366f1', borderRadius: 2 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{monthRevVal}</div>
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              ↑ 16.4% مقارنة بالشهر الماضي
            </div>
          </div>

          {/* Card 4: حضور اليوم */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '22px 24px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>حضور اليوم</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
              <span style={{ width: 3, height: 26, background: '#00d4ff', borderRadius: 2 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{todayAttVal}</div>
            </div>
            <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 700, marginTop: 12 }}>
              {activeNowVal} عضواً داخل الجيم الآن
            </div>
          </div>
        </div>

        {/* ── 3. Middle Row: Chart (Right) + Quick Actions (Left) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.1fr 1fr',
          gap: 16,
          marginBottom: 24
        }}>
          {/* Chart Card (Right Column) */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Header: Title + Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              {/* Legend (Left) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8c90a4' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                  نوفمبر 2026
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8c90a4' }}>
                  <span style={{ width: 14, height: 2, borderBottom: '2px dashed #00d4ff', display: 'inline-block' }} />
                  أكتوبر 2026
                </div>
              </div>

              {/* Title (Right) */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>نمو الإيرادات التراكمي</div>
                <div style={{ fontSize: 11, color: '#8c90a4', marginTop: 2 }}>نوفمبر 2026 •</div>
              </div>
            </div>

            {/* SVG Chart with Y-axis and smooth curves */}
            <div style={{ position: 'relative', width: '100%', height: 210 }}>
              {/* Y Axis Labels (Left) */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 24,
                left: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#55586d',
                fontFamily: 'Inter, sans-serif'
              }}>
                <span>150k</span>
                <span>100k</span>
                <span>50k</span>
                <span>0</span>
              </div>

              {/* Chart SVG Canvas */}
              <div style={{ marginRight: 0, marginLeft: 44, height: '100%' }}>
                <svg
                  viewBox="0 0 600 180"
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: 160, overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="areaGradientPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="0" y1="10" x2="600" y2="10" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="600" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="110" x2="600" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                  {/* Purple Area Fill */}
                  <path
                    d="M 0 160 L 0 156 Q 100 148 180 135 T 320 105 T 460 70 T 580 40 L 580 160 Z"
                    fill="url(#areaGradientPurple)"
                  />

                  {/* October Dashed Cyan Line */}
                  <path
                    d="M 0 160 Q 120 152 200 142 T 340 120 T 480 92 T 580 72"
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.85"
                  />

                  {/* November Solid Purple Line */}
                  <path
                    d="M 0 156 Q 100 148 180 135 T 320 105 T 460 70 T 580 40"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Current Point Circle with glowing ring */}
                  <circle cx="580" cy="40" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />
                </svg>

                {/* X Axis Date Labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  fontSize: 11,
                  color: '#55586d'
                }}>
                  <span>01 نوفمبر</span>
                  <span>05 نوفمبر</span>
                  <span>10 نوفمبر</span>
                  <span>15 نوفمبر</span>
                  <span>21 نوفمبر</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Expiring Warning Stack (Left Column) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Card 1: ابدأ من هنا */}
            <div style={{
              background: '#151622',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 16,
              padding: '22px 20px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginBottom: 14 }}>ابدأ من هنا</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => router.push('/members')}
                  style={{
                    flex: 1,
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 0',
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  + عضو جديد
                </button>
                <button
                  onClick={() => router.push('/attendance')}
                  style={{
                    flex: 1,
                    background: '#202330',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '10px 0',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  مسح QR
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#8c90a4', textAlign: 'center', marginTop: 14 }}>
                إدارة أسرع. وقت أكثر لأعضائك.
              </div>
            </div>

            {/* Card 2: 24 اشتراكاً تنتهي قريباً */}
            <div
              onClick={() => router.push('/expiring-soon')}
              style={{
                background: '#281622',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 16,
                padding: '22px 20px',
                textAlign: 'right',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
                {expiringVal} اشتراكاً تنتهي قريباً
              </div>
              <div style={{ fontSize: 12, color: '#d890a8', marginBottom: 16 }}>
                8 أعضاء تنتهي اشتراكاتهم خلال 48 ساعة.
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#e284a0',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                عرض قائمة التجديدات ←
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Bottom Row: Recent Members (Right) + Recent Activities (Left) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.9fr 1fr',
          gap: 16
        }}>
          {/* Right Column: أحدث الأعضاء Table */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 26px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <Link
                href="/members"
                style={{
                  fontSize: 12,
                  color: '#8c90a4',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                عرض الكل ←
              </Link>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>أحدث الأعضاء</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>العضو</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>الباقة</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>تاريخ الانضمام</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: '#60637a', fontWeight: 600, textAlign: 'left' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'أحمد محمد علي', plan: 'باقة الاحتراف', date: '2026/11/21' },
                  { name: 'عمر خالد حسن', plan: 'الباقة الشهرية', date: '2026/11/21' },
                  { name: 'محمد عبد الله', plan: 'باقة الاحتراف', date: '2026/11/21' },
                  { name: 'يوسف إبراهيم', plan: 'الباقة الشهرية', date: '2026/11/21' },
                ].map((member, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < 3 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      {member.name}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#8c90a4' }}>
                      {member.plan}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#8c90a4' }}>
                      {member.date}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'left' }}>
                      <span style={{
                        background: '#143323',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 6,
                        padding: '3px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-block'
                      }}>
                        نشط
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Left Column: آخر النشاطات */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 22px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', width: '100%', textAlign: 'right' }}>
                آخر النشاطات
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Item 1 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#60637a' }}>منذ 5 دقائق</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>اشتراك جديد</div>
                    <div style={{ fontSize: 11, color: '#8c90a4', marginTop: 2 }}>أحمد محمد · باقة الاحتراف</div>
                  </div>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#818cf8',
                    marginTop: 5,
                    display: 'inline-block'
                  }} />
                </div>
              </div>

              {/* Item 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#60637a' }}>منذ 12 دقيقة</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>دفعة مستلمة</div>
                    <div style={{ fontSize: 11, color: '#8c90a4', marginTop: 2 }}>850 ج.م · نقدي</div>
                  </div>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#00d4ff',
                    marginTop: 5,
                    display: 'inline-block'
                  }} />
                </div>
              </div>

              {/* Item 3 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#60637a' }}>منذ 18 دقيقة</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>تسجيل حضور</div>
                    <div style={{ fontSize: 11, color: '#8c90a4', marginTop: 2 }}>عمر خالد · مسح QR</div>
                  </div>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#818cf8',
                    marginTop: 5,
                    display: 'inline-block'
                  }} />
                </div>
              </div>

              {/* Item 4 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#60637a' }}>منذ 24 دقيقة</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>تجديد اشتراك</div>
                    <div style={{ fontSize: 11, color: '#8c90a4', marginTop: 2 }}>يوسف إبراهيم · 3 أشهر</div>
                  </div>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#00d4ff',
                    marginTop: 5,
                    display: 'inline-block'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Single Visit Modal */}
      <SingleVisitModal
        open={showSingleVisitModal}
        onClose={() => setShowSingleVisitModal(false)}
        onSuccess={loadAll}
      />
    </div>
  );
}
