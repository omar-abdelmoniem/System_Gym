'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useFastQuery } from '../../lib/swr';
import ConfirmModal from '../../components/ConfirmModal';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

// ─── Subscription Plans Section ──────────────────────────────────────────────
interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  durationMonths: number;
  features?: string[];
  description?: string;
  freezeDays?: number;
  privateSessionsCount?: number;
  feedbackInterval?: number;
  popular?: boolean;
}

const Plans = () => {
  const [tab, setTab] = useState<'subscriptions' | 'workout' | 'diet'>('subscriptions');
  const { data: memData } = useFastQuery('/members');
  const { data: plansData, mutate: mutatePlans } = useFastQuery('/subscriptions/plans');
  const members = Array.isArray(memData) ? memData.filter((m: any) => m.active) : [];
  const subscriptionPlans: SubscriptionPlan[] = Array.isArray(plansData) ? plansData : [];

  const [message, setMessage] = useState('');
  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  // ─── Plan Form State ───
  const emptyPlanForm = { name: '', price: '', durationMonths: '', freezeDays: '', privateSessionsCount: '', features: '', description: '' };
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  const openAddPlan = () => {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name,
      price: String(plan.price),
      durationMonths: String(plan.durationMonths),
      freezeDays: String(plan.freezeDays || ''),
      privateSessionsCount: String(plan.privateSessionsCount || ''),
      features: (plan.features || []).join('\n'),
      description: plan.description || '',
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: planForm.name,
        price: Number(planForm.price),
        durationMonths: Number(planForm.durationMonths),
        freezeDays: Number(planForm.freezeDays) || 0,
        privateSessionsCount: Number(planForm.privateSessionsCount) || 0,
        features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean),
        description: planForm.description,
      };
      if (editingPlanId) {
        await api.put(`/subscriptions/plans/${editingPlanId}`, payload);
        showMsg('✅ تم تعديل الخطة بنجاح');
      } else {
        await api.post('/subscriptions/plans', payload);
        showMsg('✅ تم إضافة الخطة بنجاح');
      }
      setShowPlanModal(false);
      mutatePlans();
    } catch (err: any) {
      showMsg('❌ ' + (err.response?.data?.message || 'حدث خطأ'));
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await api.delete(`/subscriptions/plans/${planToDelete._id}`);
      showMsg('✅ تم حذف الخطة');
      setPlanToDelete(null);
      mutatePlans();
    } catch (err: any) {
      showMsg('❌ ' + (err.response?.data?.message || 'خطأ في الحذف'));
    }
  };

  // ─── Workout state ───
  const [confirmConfig, setConfirmConfig] = useState<any>({ open: false, title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setConfirmConfig((p: any) => ({ ...p, open: false }));

  const [wForm, setWForm] = useState({ memberId: '', planName: '', goal: '', duration: '', notes: '', days: [{ dayName: '', exercises: [{ name: '', muscleGroup: '', sets: '', reps: '', rest: '' }] }] });
  const [wViewMember, setWViewMember] = useState('');
  const [wPlans, setWPlans] = useState<any[]>([]);

  const [dForm, setDForm] = useState({ memberId: '', planName: '', goal: '', calories: '', protein: '', carbs: '', fats: '', notes: '', meals: [{ name: '', foods: [{ name: '', quantity: '', unit: '' }] }] });
  const [dViewMember, setDViewMember] = useState('');
  const [dPlans, setDPlans] = useState<any[]>([]);

  const statusBadge = (s: string) => s === 'ACTIVE' ? 'badge-success' : s === 'COMPLETED' ? 'badge-warning' : 'badge-danger';

  const addDay = () => setWForm({ ...wForm, days: [...wForm.days, { dayName: '', exercises: [{ name: '', muscleGroup: '', sets: '', reps: '', rest: '' }] }] });
  const addExercise = (di: number) => { const days = [...wForm.days]; days[di].exercises.push({ name: '', muscleGroup: '', sets: '', reps: '', rest: '' }); setWForm({ ...wForm, days }); };
  const updateDay = (di: number, field: string, val: string) => { const days: any = [...wForm.days]; days[di][field] = val; setWForm({ ...wForm, days }); };
  const updateExercise = (di: number, ei: number, field: string, val: string) => { const days: any = [...wForm.days]; days[di].exercises[ei][field] = val; setWForm({ ...wForm, days }); };
  const removeDay = (di: number) => { const days = wForm.days.filter((_, i) => i !== di); setWForm({ ...wForm, days: days.length ? days : [{ dayName: '', exercises: [{ name: '', muscleGroup: '', sets: '', reps: '', rest: '' }] }] }); };

  const submitWorkout = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/workout-plans', { memberId: wForm.memberId, planName: wForm.planName, goal: wForm.goal, duration: wForm.duration, days: wForm.days, notes: wForm.notes });
      showMsg('✅ تم إنشاء جدول التمرين');
      setWForm({ memberId: '', planName: '', goal: '', duration: '', notes: '', days: [{ dayName: '', exercises: [{ name: '', muscleGroup: '', sets: '', reps: '', rest: '' }] }] });
      if (wViewMember) loadWorkoutPlans(wViewMember);
    } catch (err: any) { showMsg('❌ ' + (err.response?.data?.message || 'خطأ')); }
  };

  const loadWorkoutPlans = async (mid: string) => {
    setWViewMember(mid);
    if (!mid) { setWPlans([]); return; }
    try { const { data } = await api.get(`/workout-plans/member/${mid}`); setWPlans(data.data || []); } catch { setWPlans([]); }
  };

  const completeWorkout = async (id: string) => {
    await api.post(`/workout-plans/${id}/complete`);
    loadWorkoutPlans(wViewMember);
  };

  const deleteWorkout = (id: string, planName?: string) => {
    setConfirmConfig({
      open: true, type: 'danger',
      title: 'تأكيد حذف جدول التمرين',
      message: <span>هل أنت متأكد من حذف جدول التمرين <strong className="confirm-highlight">"{planName || ''}"</strong>؟</span>,
      confirmText: 'نعم، احذف الخطة', cancelText: 'إلغاء',
      onConfirm: async () => { closeModal(); try { await api.delete(`/workout-plans/${id}`); loadWorkoutPlans(wViewMember); } catch { showMsg('❌ فشل الحذف'); } },
      onCancel: closeModal,
    });
  };

  const addMeal = () => setDForm({ ...dForm, meals: [...dForm.meals, { name: '', foods: [{ name: '', quantity: '', unit: '' }] }] });
  const addFood = (mi: number) => { const meals = [...dForm.meals]; meals[mi].foods.push({ name: '', quantity: '', unit: '' }); setDForm({ ...dForm, meals }); };
  const updateMeal = (mi: number, field: string, val: string) => { const meals: any = [...dForm.meals]; meals[mi][field] = val; setDForm({ ...dForm, meals }); };
  const updateFood = (mi: number, fi: number, field: string, val: string) => { const meals: any = [...dForm.meals]; meals[mi].foods[fi][field] = val; setDForm({ ...dForm, meals }); };
  const removeMeal = (mi: number) => { const meals = dForm.meals.filter((_, i) => i !== mi); setDForm({ ...dForm, meals: meals.length ? meals : [{ name: '', foods: [{ name: '', quantity: '', unit: '' }] }] }); };

  const submitDiet = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/diet-plans', { memberId: dForm.memberId, planName: dForm.planName, goal: dForm.goal, calories: Number(dForm.calories) || undefined, protein: dForm.protein, carbs: dForm.carbs, fats: dForm.fats, meals: dForm.meals, notes: dForm.notes });
      showMsg('✅ تم إنشاء النظام الغذائي');
      setDForm({ memberId: '', planName: '', goal: '', calories: '', protein: '', carbs: '', fats: '', notes: '', meals: [{ name: '', foods: [{ name: '', quantity: '', unit: '' }] }] });
      if (dViewMember) loadDietPlans(dViewMember);
    } catch (err: any) { showMsg('❌ ' + (err.response?.data?.message || 'خطأ')); }
  };

  const loadDietPlans = async (mid: string) => {
    setDViewMember(mid);
    if (!mid) { setDPlans([]); return; }
    try { const { data } = await api.get(`/diet-plans/member/${mid}`); setDPlans(data.data || []); } catch { setDPlans([]); }
  };

  const deleteDiet = (id: string, planName?: string) => {
    setConfirmConfig({
      open: true, type: 'danger',
      title: 'تأكيد حذف النظام الغذائي',
      message: <span>هل أنت متأكد من حذف النظام الغذائي <strong className="confirm-highlight">"{planName || ''}"</strong>؟</span>,
      confirmText: 'نعم، احذف الخطة', cancelText: 'إلغاء',
      onConfirm: async () => { closeModal(); try { await api.delete(`/diet-plans/${id}`); loadDietPlans(dViewMember); } catch { showMsg('❌ فشل الحذف'); } },
      onCancel: closeModal,
    });
  };

  // Plan accent colors
  const planColors = [
    { accent: '#00d4ff', glow: 'rgba(0,212,255,0.15)', border: 'rgba(0,212,255,0.3)' },
    { accent: '#6366f1', glow: 'rgba(99,102,241,0.2)', border: 'rgba(99,102,241,0.4)' },
    { accent: '#10b981', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
    { accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  ];

  // Fallback comparison table features
  const comparisonFeatures = [
    { key: 'مدة الاشتراك', getValue: (p: SubscriptionPlan) => `${p.durationMonths} ${p.durationMonths === 1 ? 'شهر' : 'أشهر'}` },
    { key: 'جلسات التدريب الخاص', getValue: (p: SubscriptionPlan) => p.privateSessionsCount ? `${p.privateSessionsCount} جلسات` : '—' },
    { key: 'أيام التجميد', getValue: (p: SubscriptionPlan) => p.freezeDays ? `${p.freezeDays} أيام` : '3 أيام' },
    { key: 'الحالة', getValue: () => 'متاحة للتسجيل' },
  ];

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <button
          className="btn-primary"
          onClick={openAddPlan}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
        >
          <PlusIcon style={{ width: 18, height: 18 }} />
          إضافة خطة
        </button>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0 }}>الخطط</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>خطط مرنة لكل هدف · صمّم باقات الاشتراك والأسعار والمزايا لأعضائك</div>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 20px', borderRadius: 12, marginBottom: 20,
          background: message.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: message.startsWith('✅') ? '#34d399' : '#f87171',
          border: `1px solid ${message.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          fontWeight: 700, textAlign: 'center',
        }}>{message}</div>
      )}

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {[
          { key: 'subscriptions', label: '💳 خطط الاشتراك' },
          { key: 'workout', label: '💪 جداول التمرين' },
          { key: 'diet', label: '🥗 الأنظمة الغذائية' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '11px 22px', border: 'none', borderRadius: '10px 10px 0 0',
              fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ─── Subscription Plans Tab ─── */}
      {tab === 'subscriptions' && (
        <>
          {/* Plan Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
            {subscriptionPlans.map((plan, idx) => {
              const color = planColors[idx % planColors.length];
              const isPopular = idx === 1 || plan.popular;
              return (
                <div
                  key={plan._id}
                  style={{
                    background: isPopular
                      ? `linear-gradient(145deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 100%)`
                      : 'var(--bg-card)',
                    border: `1.5px solid ${isPopular ? 'rgba(99,102,241,0.5)' : color.border}`,
                    borderRadius: 20,
                    padding: 24,
                    position: 'relative',
                    boxShadow: isPopular ? `0 8px 32px rgba(99,102,241,0.2)` : `0 4px 16px rgba(0,0,0,0.2)`,
                    display: 'flex', flexDirection: 'column', gap: 16,
                    transition: 'transform 0.2s',
                  }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: -12, right: 20,
                      background: 'var(--primary)', color: '#fff',
                      fontSize: 11, fontWeight: 800, padding: '4px 14px',
                      borderRadius: 20, boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    }}>الأكثر اشتراكاً</div>
                  )}
                  {!isPopular && idx === 0 && (
                    <div style={{
                      position: 'absolute', top: -12, right: 20,
                      background: 'rgba(0,212,255,0.2)', color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,0.4)',
                      fontSize: 11, fontWeight: 800, padding: '4px 14px',
                      borderRadius: 20,
                    }}>بداية قوية</div>
                  )}
                  {!isPopular && idx > 1 && (
                    <div style={{
                      position: 'absolute', top: -12, right: 20,
                      background: 'rgba(16,185,129,0.2)', color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.4)',
                      fontSize: 11, fontWeight: 800, padding: '4px 14px',
                      borderRadius: 20,
                    }}>أفضل قيمة</div>
                  )}

                  {/* Plan Name */}
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', textAlign: 'right', marginTop: 10 }}>{plan.name}</div>

                  {/* Price */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: isPopular ? '#818cf8' : color.accent }}>{plan.price.toLocaleString()}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 6 }}>ج.م / {plan.durationMonths === 1 ? 'شهر واحد' : `${plan.durationMonths} أشهر`}</span>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(plan.features && plan.features.length > 0 ? plan.features : [
                      'دخول مفتوح لصالة الجيم',
                      'تقييم لياقة أولي',
                      'مراقبة الحضور عبر QR',
                      `تجميد حتى ${plan.freezeDays || 3} أيام`,
                    ]).map((feat, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontSize: 13, color: 'var(--text-muted)' }}>
                        <span>{feat}</span>
                        <CheckCircleIcon style={{ width: 16, height: 16, color: isPopular ? '#818cf8' : color.accent, flexShrink: 0 }} />
                      </div>
                    ))}
                    {plan.privateSessionsCount ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontSize: 13, color: 'var(--text-muted)' }}>
                        <span>{plan.privateSessionsCount} جلسة مع مدرب خاص</span>
                        <CheckCircleIcon style={{ width: 16, height: 16, color: isPopular ? '#818cf8' : color.accent, flexShrink: 0 }} />
                      </div>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => setPlanToDelete(plan)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
                        fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <TrashIcon style={{ width: 15, height: 15 }} />
                      حذف
                    </button>
                    <button
                      onClick={() => openEditPlan(plan)}
                      style={{
                        flex: 2, padding: '10px 0', borderRadius: 10,
                        border: `1px solid ${isPopular ? 'rgba(99,102,241,0.4)' : color.border}`,
                        background: isPopular ? 'rgba(99,102,241,0.15)' : color.glow,
                        color: isPopular ? '#818cf8' : color.accent, cursor: 'pointer',
                        fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <PencilSquareIcon style={{ width: 15, height: 15 }} />
                      تعديل الخطة
                    </button>
                  </div>
                </div>
              );
            })}

            {subscriptionPlans.length === 0 && (
              <div style={{
                gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px',
                background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border-color)',
                color: 'var(--text-muted)',
              }}>
                <ClipboardDocumentListIcon style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد خطط اشتراك بعد</div>
                <div style={{ fontSize: 13 }}>اضغط "إضافة خطة" لإنشاء أول خطة اشتراك</div>
              </div>
            )}
          </div>

          {/* Comparison Table */}
          {subscriptionPlans.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, border: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>مقارنة المزايا والسياسات</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>الأسعار تشمل رسوم الاشتراك · العملة الجنيه المصري</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, minWidth: 160 }}>الميزة</th>
                      {subscriptionPlans.map(p => (
                        <th key={p._id} style={{ padding: '10px 14px', color: '#fff', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feat, fi) => (
                      <tr key={fi} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: fi % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13 }}>{feat.key}</td>
                        {subscriptionPlans.map(p => (
                          <td key={p._id} style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                            {feat.getValue(p)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Workout Tab ─── */}
      {tab === 'workout' && (
        <div>
          <form className="form-card" onSubmit={submitWorkout} style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardDocumentListIcon style={{ width: 20, height: 20 }} />
              إنشاء جدول تمرين جديد
            </h3>
            <div className="form-row">
              <div><label>العضو</label><select value={wForm.memberId} onChange={e => setWForm({ ...wForm, memberId: e.target.value })} required><option value="">اختر عضو</option>{members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div><label>اسم الخطة</label><input value={wForm.planName} onChange={e => setWForm({ ...wForm, planName: e.target.value })} required placeholder="مثال: Fat Loss Program" /></div>
            </div>
            <div className="form-row">
              <div><label>الهدف</label><input value={wForm.goal} onChange={e => setWForm({ ...wForm, goal: e.target.value })} placeholder="مثال: فقدان الدهون" /></div>
              <div><label>المدة</label><input value={wForm.duration} onChange={e => setWForm({ ...wForm, duration: e.target.value })} placeholder="مثال: 12 أسبوع" /></div>
            </div>
            {wForm.days.map((day, di) => (
              <div key={di} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 12, background: 'var(--bg-input)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <input value={day.dayName} onChange={e => updateDay(di, 'dayName', e.target.value)} placeholder={`اليوم ${di + 1}: مثال Chest + Triceps`} style={{ flex: 1, marginBottom: 0 }} />
                  <button type="button" onClick={() => removeDay(di)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', marginRight: 8, fontSize: 12 }}>حذف اليوم</button>
                </div>
                {day.exercises.map((ex, ei) => (
                  <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr 0.5fr 0.5fr', gap: 8, marginBottom: 8 }}>
                    <input value={ex.name} onChange={e => updateExercise(di, ei, 'name', e.target.value)} placeholder="التمرين" style={{ marginBottom: 0 }} />
                    <input value={ex.muscleGroup} onChange={e => updateExercise(di, ei, 'muscleGroup', e.target.value)} placeholder="العضلة" style={{ marginBottom: 0 }} />
                    <input value={ex.sets} onChange={e => updateExercise(di, ei, 'sets', e.target.value)} placeholder="Sets" style={{ marginBottom: 0 }} />
                    <input value={ex.reps} onChange={e => updateExercise(di, ei, 'reps', e.target.value)} placeholder="Reps" style={{ marginBottom: 0 }} />
                    <input value={ex.rest} onChange={e => updateExercise(di, ei, 'rest', e.target.value)} placeholder="Rest" style={{ marginBottom: 0 }} />
                  </div>
                ))}
                <button type="button" onClick={() => addExercise(di)} style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ إضافة تمرين</button>
              </div>
            ))}
            <button type="button" onClick={addDay} style={{ background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', marginBottom: 12, width: '100%' }}>+ إضافة يوم جديد</button>
            <label>ملاحظات</label>
            <textarea value={wForm.notes} onChange={e => setWForm({ ...wForm, notes: e.target.value })} />
            <button type="submit">إنشاء جدول التمرين</button>
          </form>

          <div className="form-card">
            <h3 style={{ marginBottom: 12 }}>عرض خطط عضو</h3>
            <select value={wViewMember} onChange={e => loadWorkoutPlans(e.target.value)}>
              <option value="">اختر عضو</option>
              {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            {wPlans.length > 0 && (
              <div className="table-container" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead><tr><th>الخطة</th><th>الهدف</th><th>المدة</th><th>الأيام</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {wPlans.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 'bold' }}>{p.planName}</td>
                        <td>{p.goal || '-'}</td>
                        <td>{p.duration || '-'}</td>
                        <td>{p.days?.length || 0} أيام</td>
                        <td><span className={'badge ' + statusBadge(p.status)}>{p.status}</span></td>
                        <td>
                          {p.status === 'ACTIVE' && <button className="btn-small" onClick={() => completeWorkout(p._id)}>إكمال</button>}
                          <button className="btn-small btn-danger" onClick={() => deleteWorkout(p._id, p.planName)} style={{ marginRight: 4 }}>حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {wViewMember && wPlans.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>لا توجد خطط لهذا العضو</div>}
          </div>
        </div>
      )}

      {/* ─── Diet Tab ─── */}
      {tab === 'diet' && (
        <div>
          <form className="form-card" onSubmit={submitDiet} style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScaleIcon style={{ width: 20, height: 20 }} />
              إنشاء نظام غذائي جديد
            </h3>
            <div className="form-row">
              <div><label>العضو</label><select value={dForm.memberId} onChange={e => setDForm({ ...dForm, memberId: e.target.value })} required><option value="">اختر عضو</option>{members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div><label>اسم الخطة</label><input value={dForm.planName} onChange={e => setDForm({ ...dForm, planName: e.target.value })} required placeholder="مثال: Fat Loss Diet" /></div>
            </div>
            <div className="form-row">
              <div><label>الهدف</label><input value={dForm.goal} onChange={e => setDForm({ ...dForm, goal: e.target.value })} placeholder="فقدان وزن / تضخيم" /></div>
              <div><label>السعرات (Calories)</label><input type="number" value={dForm.calories} onChange={e => setDForm({ ...dForm, calories: e.target.value })} placeholder="2200" /></div>
            </div>
            <div className="form-row">
              <div><label>بروتين</label><input value={dForm.protein} onChange={e => setDForm({ ...dForm, protein: e.target.value })} placeholder="180g" /></div>
              <div><label>كربوهيدرات</label><input value={dForm.carbs} onChange={e => setDForm({ ...dForm, carbs: e.target.value })} placeholder="200g" /></div>
              <div><label>دهون</label><input value={dForm.fats} onChange={e => setDForm({ ...dForm, fats: e.target.value })} placeholder="70g" /></div>
            </div>
            {dForm.meals.map((meal, mi) => (
              <div key={mi} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 12, background: 'var(--bg-input)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <input value={meal.name} onChange={e => updateMeal(mi, 'name', e.target.value)} placeholder={`الوجبة ${mi + 1}: مثال Breakfast`} style={{ flex: 1, marginBottom: 0 }} />
                  <button type="button" onClick={() => removeMeal(mi)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', marginRight: 8, fontSize: 12 }}>حذف</button>
                </div>
                {meal.foods.map((food, fi) => (
                  <div key={fi} style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 0.5fr', gap: 8, marginBottom: 8 }}>
                    <input value={food.name} onChange={e => updateFood(mi, fi, 'name', e.target.value)} placeholder="اسم الطعام" style={{ marginBottom: 0 }} />
                    <input value={food.quantity} onChange={e => updateFood(mi, fi, 'quantity', e.target.value)} placeholder="الكمية" style={{ marginBottom: 0 }} />
                    <input value={food.unit} onChange={e => updateFood(mi, fi, 'unit', e.target.value)} placeholder="الوحدة (جم/حبة)" style={{ marginBottom: 0 }} />
                  </div>
                ))}
                <button type="button" onClick={() => addFood(mi)} style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ إضافة طعام</button>
              </div>
            ))}
            <button type="button" onClick={addMeal} style={{ background: 'transparent', border: '1px dashed #10b981', color: '#10b981', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', marginBottom: 12, width: '100%' }}>+ إضافة وجبة جديدة</button>
            <label>ملاحظات</label>
            <textarea value={dForm.notes} onChange={e => setDForm({ ...dForm, notes: e.target.value })} />
            <button type="submit">إنشاء النظام الغذائي</button>
          </form>

          <div className="form-card">
            <h3 style={{ marginBottom: 12 }}>عرض أنظمة عضو</h3>
            <select value={dViewMember} onChange={e => loadDietPlans(e.target.value)}>
              <option value="">اختر عضو</option>
              {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            {dPlans.length > 0 && (
              <div className="table-container" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead><tr><th>الخطة</th><th>الهدف</th><th>السعرات</th><th>البروتين</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {dPlans.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 'bold' }}>{p.planName}</td>
                        <td>{p.goal || '-'}</td>
                        <td>{p.calories || '-'}</td>
                        <td>{p.protein || '-'}</td>
                        <td><span className={'badge ' + statusBadge(p.status)}>{p.status}</span></td>
                        <td><button className="btn-small btn-danger" onClick={() => deleteDiet(p._id, p.planName)}>حذف</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {dViewMember && dPlans.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>لا توجد أنظمة غذائية لهذا العضو</div>}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Plan Modal ─── */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editingPlanId ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}</h3>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePlan} style={{ padding: '0 20px 24px' }}>
              <div className="form-row">
                <div><label>اسم الخطة</label><input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} required placeholder="مثال: الباقة الشهرية" /></div>
                <div><label>السعر (ج.م)</label><input type="number" min="0" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} required placeholder="450" /></div>
              </div>
              <div className="form-row">
                <div><label>المدة (بالأشهر)</label><input type="number" min="1" value={planForm.durationMonths} onChange={e => setPlanForm({ ...planForm, durationMonths: e.target.value })} required placeholder="1" /></div>
                <div><label>أيام التجميد المسموحة</label><input type="number" min="0" value={planForm.freezeDays} onChange={e => setPlanForm({ ...planForm, freezeDays: e.target.value })} placeholder="3" /></div>
              </div>
              <div>
                <label>عدد الجلسات الخاصة (اختياري)</label>
                <input type="number" min="0" value={planForm.privateSessionsCount} onChange={e => setPlanForm({ ...planForm, privateSessionsCount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label>المزايا (كل ميزة في سطر جديد)</label>
                <textarea
                  value={planForm.features}
                  onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                  placeholder="دخول مفتوح لصالة الجيم&#10;مراقبة الحضور عبر QR&#10;تقييم لياقة أولي"
                  rows={4}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                {editingPlanId ? '💾 حفظ التعديلات' : '+ إضافة الخطة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Plan Confirm */}
      <ConfirmModal
        open={!!planToDelete}
        type="danger"
        title="تأكيد حذف الخطة"
        message={<span>هل أنت متأكد من حذف خطة <strong className="confirm-highlight">"{planToDelete?.name}"</strong>؟</span>}
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        onConfirm={handleDeletePlan}
        onCancel={() => setPlanToDelete(null)}
      />

      {/* Workout/Diet Confirm Modal */}
      <ConfirmModal
        open={confirmConfig.open}
        type={confirmConfig.type || 'danger'}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />
    </div>
  );
};

export default Plans;
