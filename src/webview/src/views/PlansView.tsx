import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, CheckSquare, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { FullState } from '../hooks/useVSCodeMessage';

interface PlansViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
}

const PlansView: React.FC<PlansViewProps> = ({ state, searchTerm, onAction }) => {
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [newStepText, setNewStepText] = useState('');
  const [selectedPlanForStep, setSelectedPlanForStep] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [removeStepTarget, setRemoveStepTarget] = useState<{ planId: string; stepIndex: number } | null>(null);

  // Filter plans
  const filteredPlans = useMemo(() => {
    return state.plans
      .filter((plan: any) => 
        plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.steps.some((step: string) => step.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [state.plans, searchTerm]);

  const handleAddPlan = () => {
    if (!newPlanTitle.trim()) return;
    
    onAction('addPlan', { 
      title: newPlanTitle.trim(), 
      start: newStart,
      end: newEnd 
    });
    
    setNewPlanTitle('');
    setNewStart('');
    setNewEnd('');
  };

  const handleDeletePlan = (id: string) => {
    setDeletePlanId(id);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setEditTitle(plan.title);
    setEditStart(plan.timeline?.start || '');
    setEditEnd(plan.timeline?.end || '');
  };

  const handleSaveEdit = () => {
    if (!editingPlan) return;
    
    onAction('updatePlan', { 
      id: editingPlan.id, 
      patch: { 
        title: editTitle.trim(),
        timeline: { 
          start: editStart, 
          end: editEnd 
        } 
      } 
    });
    
    setEditingPlan(null);
  };

  const addStepToPlan = (planId: string) => {
    if (!newStepText.trim() || !planId) return;
    
    onAction('addPlanStep', { 
      id: planId, 
      step: newStepText.trim() 
    });
    
    setNewStepText('');
    setSelectedPlanForStep(null);
  };

  const toggleStep = (planId: string, stepIndex: number, currentSteps: string[]) => {
    // For simplicity, we don't have completed state on steps in model, so just remove or leave
    // To demonstrate, we'll remove completed steps (or could extend model but keep to current contract)
    setRemoveStepTarget({ planId, stepIndex });
  };

  const removeStep = (planId: string, stepIndex: number) => {
    setRemoveStepTarget({ planId, stepIndex });
  };

  return (
    <div className="plans-view">
      <div className="kanban-add">
        <input
          type="text"
          value={newPlanTitle}
          onChange={(e) => setNewPlanTitle(e.target.value)}
          placeholder="New plan title (e.g. Q4 Product Launch)"
          style={{ flex: 1 }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddPlan()}
        />
        <input
          type="date"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          placeholder="Start date"
          style={{ width: '140px' }}
        />
        <input
          type="date"
          value={newEnd}
          onChange={(e) => setNewEnd(e.target.value)}
          placeholder="End date"
          style={{ width: '140px' }}
        />
        <button className="btn" onClick={handleAddPlan}>
          <Plus size={16} /> Create Plan
        </button>
      </div>

      <div className="plan-list">
        {filteredPlans.map((plan: any) => (
          <div key={plan.id} className="plan-card">
            <div className="plan-header">
              <div>
                <div className="plan-title">{plan.title}</div>
                {(plan.timeline?.start || plan.timeline?.end) && (
                  <div className="plan-timeline">
                    <Calendar size={14} />
                    {plan.timeline.start && new Date(plan.timeline.start).toLocaleDateString()} 
                    {' → '}
                    {plan.timeline.end && new Date(plan.timeline.end).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn secondary"
                  onClick={() => openEditModal(plan)}
                  title="Edit plan"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  className="icon-btn delete-btn card-delete-btn"
                  onClick={() => handleDeletePlan(plan.id)}
                  title="Delete plan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="plan-steps">
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--muted)', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckSquare size={14} />
                STEPS ({plan.steps.length})
              </div>
              
              {plan.steps.length > 0 ? (
                plan.steps.map((step: string, index: number) => (
                  <div key={index} className="plan-step">
                    <input 
                      type="checkbox" 
                      onChange={() => toggleStep(plan.id, index, plan.steps)}
                    />
                    <span style={{ flex: 1 }}>{step}</span>
                    <button 
                      onClick={() => removeStep(plan.id, index)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--muted)', 
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                      title="Remove step"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--muted)', 
                  fontStyle: 'italic',
                  background: 'var(--hover)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  No steps yet. Add some below.
                </div>
              )}
            </div>

            <div className="add-step-form">
              <input
                type="text"
                value={selectedPlanForStep === plan.id ? newStepText : ''}
                onChange={(e) => {
                  setNewStepText(e.target.value);
                  setSelectedPlanForStep(plan.id);
                }}
                placeholder="Add next step..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedPlanForStep === plan.id) {
                    addStepToPlan(plan.id);
                  }
                }}
              />
              <button 
                className="btn secondary"
                onClick={() => addStepToPlan(plan.id)}
              >
                <Plus size={14} /> Add Step
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPlans.length === 0 && state.plans.length > 0 && (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          No plans match your search.
        </div>
      )}
      
      {state.plans.length === 0 && (
        <div className="empty-state">
          <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.6 }} />
          <h3>No plans created yet</h3>
          <p>Plans help break down big initiatives into actionable steps with timelines.</p>
          <p style={{ fontSize: '12px', maxWidth: '380px', margin: '20px auto 0' }}>
            Add steps with checkboxes • Timeline dates • Full CRUD support
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title="Edit Plan"
        footer={
          <>
            <button className="btn secondary" onClick={() => setEditingPlan(null)}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveEdit}>
              Update Plan
            </button>
          </>
        }
      >
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Plan Title
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ width: '100%', marginBottom: '20px' }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                End Date
              </label>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '24px', padding: '14px', background: 'var(--hover)', borderRadius: '8px', fontSize: '12.5px' }}>
            Tip: Use the inline form below each plan card to add steps. Checking a step removes it (marking complete).
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletePlanId}
        message="Delete this plan and all its steps? This action cannot be undone."
        onCancel={() => setDeletePlanId(null)}
        onConfirm={() => {
          if (deletePlanId) onAction('deletePlan', { id: deletePlanId });
          setDeletePlanId(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!removeStepTarget}
        message="Remove this plan step?"
        onCancel={() => setRemoveStepTarget(null)}
        onConfirm={() => {
          if (removeStepTarget) {
            onAction('removePlanStep', removeStepTarget);
          }
          setRemoveStepTarget(null);
        }}
      />
    </div>
  );
};

export default PlansView;
