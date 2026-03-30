'use client';
import { useState, useEffect } from 'react';
import { SECTION_TYPES, SECTION_TEMPLATES, CTA_TYPES } from '@/lib/constants';

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionType, setNewSectionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSections(); }, []);

  async function loadSections() {
    try {
      const res = await fetch('/api/sections?all=true');
      const data = await res.json();
      setSections((data.sections || []).sort((a, b) => a.order_index - b.order_index));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAddSection(type) {
    setSaving(true);
    const template = SECTION_TEMPLATES[type];
    const newSection = {
      type,
      title: SECTION_TYPES[type]?.label || '새 섹션',
      subtitle: '',
      content: template,
      order_index: sections.length,
      is_active: true,
    };
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      });
      const data = await res.json();
      setSections([...sections, data.section]);
      setShowAddModal(false);
      setNewSectionType('');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleUpdateSection(section) {
    setSaving(true);
    try {
      await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section),
      });
      setSections(sections.map(s => s.id === section.id ? section : s));
      setEditingSection(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDeleteSection(id) {
    if (!confirm('이 섹션을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
      setSections(sections.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  }

  async function handleToggleActive(section) {
    const updated = { ...section, is_active: !section.is_active };
    await handleUpdateSection(updated);
  }

  async function handleMoveSection(index, direction) {
    const newSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    // Update order_index
    newSections.forEach((s, i) => { s.order_index = i; });
    setSections(newSections);

    // Save both
    await Promise.all([
      fetch('/api/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSections[index]) }),
      fetch('/api/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSections[targetIndex]) }),
    ]);
  }

  if (loading) return <div style={{ padding: 'var(--space-2xl)', color: 'var(--admin-text-secondary)' }}>로딩 중...</div>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">섹션 관리</h1>
          <p className="admin-subtitle">랜딩 페이지에 표시할 섹션을 추가, 수정, 삭제하세요</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ 새 섹션 추가
        </button>
      </div>

      {/* Section List */}
      {sections.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 'var(--space-4xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📭</div>
          <p style={{ color: 'var(--admin-text-secondary)' }}>아직 섹션이 없습니다. 새 섹션을 추가해보세요!</p>
        </div>
      ) : (
        <div>
          {sections.map((section, i) => (
            <div key={section.id} className="section-list-item">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  className="admin-btn admin-btn-secondary btn-icon"
                  style={{ padding: '2px 6px', fontSize: '10px' }}
                  onClick={() => handleMoveSection(i, -1)}
                  disabled={i === 0}
                >▲</button>
                <button
                  className="admin-btn admin-btn-secondary btn-icon"
                  style={{ padding: '2px 6px', fontSize: '10px' }}
                  onClick={() => handleMoveSection(i, 1)}
                  disabled={i === sections.length - 1}
                >▼</button>
              </div>
              <span className="section-list-icon">
                {SECTION_TYPES[section.type]?.icon || '📝'}
              </span>
              <div className="section-list-info">
                <div className="section-list-name">{section.title}</div>
                <div className="section-list-type">{SECTION_TYPES[section.type]?.label || section.type}</div>
              </div>
              <span className={`badge ${section.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {section.is_active ? '활성' : '비활성'}
              </span>
              <div className="section-list-actions">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={section.is_active}
                    onChange={() => handleToggleActive(section)}
                  />
                  <span className="toggle-slider" />
                </label>
                <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => setEditingSection({ ...section })}>
                  ✏️ 수정
                </button>
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => handleDeleteSection(section.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">새 섹션 추가</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
              추가할 섹션 유형을 선택하세요
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
              {Object.entries(SECTION_TYPES).map(([key, type]) => (
                <button
                  key={key}
                  onClick={() => handleAddSection(key)}
                  disabled={saving}
                  style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--admin-bg)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--admin-primary)'; e.target.style.background = 'rgba(99,102,241,0.04)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--admin-border)'; e.target.style.background = 'var(--admin-bg)'; }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>{type.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{type.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="modal-overlay" onClick={() => setEditingSection(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {SECTION_TYPES[editingSection.type]?.icon} 섹션 수정
              </h2>
              <button className="modal-close" onClick={() => setEditingSection(null)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">섹션 제목</label>
              <input
                className="form-input"
                value={editingSection.title}
                onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">부제목</label>
              <input
                className="form-input"
                value={editingSection.subtitle || ''}
                onChange={e => setEditingSection({ ...editingSection, subtitle: e.target.value })}
              />
            </div>

            {/* Content Editor based on type */}
            <SectionContentEditor
              type={editingSection.type}
              content={editingSection.content}
              onChange={(content) => setEditingSection({ ...editingSection, content })}
            />

            <div className="modal-actions">
              <button className="admin-btn admin-btn-secondary" onClick={() => setEditingSection(null)}>
                취소
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => handleUpdateSection(editingSection)}
                disabled={saving}
              >
                {saving ? '저장 중...' : '💾 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Section Content Editor (type-specific) =====
function SectionContentEditor({ type, content, onChange }) {
  const updateContent = (key, value) => {
    onChange({ ...content, [key]: value });
  };

  const updateItemField = (index, field, value) => {
    const items = [...(content.items || [])];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...content, items });
  };

  const addItem = (template) => {
    const items = [...(content.items || []), template];
    onChange({ ...content, items });
  };

  const removeItem = (index) => {
    const items = (content.items || []).filter((_, i) => i !== index);
    onChange({ ...content, items });
  };

  // CTA Buttons editor (shared between hero and cta types)
  const renderCTAButtons = (buttons = [], key = 'cta_buttons') => (
    <div className="form-group">
      <label className="form-label">CTA 버튼</label>
      {buttons.map((btn, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={btn.label}
            onChange={e => {
              const newBtns = [...buttons];
              newBtns[i] = { ...newBtns[i], label: e.target.value };
              updateContent(key, newBtns);
            }}
            placeholder="버튼 텍스트"
          />
          <select
            className="form-input"
            style={{ width: '140px' }}
            value={btn.type}
            onChange={e => {
              const newBtns = [...buttons];
              newBtns[i] = { ...newBtns[i], type: e.target.value };
              updateContent(key, newBtns);
            }}
          >
            {Object.entries(CTA_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={btn.url || btn.value || ''}
            onChange={e => {
              const newBtns = [...buttons];
              const field = btn.type === 'phone' ? 'value' : 'url';
              newBtns[i] = { ...newBtns[i], [field]: e.target.value };
              updateContent(key, newBtns);
            }}
            placeholder={btn.type === 'phone' ? '전화번호' : 'URL'}
          />
          <button
            className="admin-btn admin-btn-danger btn-sm"
            onClick={() => {
              const newBtns = buttons.filter((_, idx) => idx !== i);
              updateContent(key, newBtns);
            }}
          >✕</button>
        </div>
      ))}
      <button
        className="admin-btn admin-btn-secondary btn-sm"
        onClick={() => updateContent(key, [...buttons, { label: '새 버튼', type: 'kakao', url: '' }])}
      >
        ➕ 버튼 추가
      </button>
    </div>
  );

  switch (type) {
    case 'hero':
      return (
        <>
          <div className="form-group">
            <label className="form-label">헤드라인</label>
            <input className="form-input" value={content.headline || ''} onChange={e => updateContent('headline', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">설명</label>
            <textarea className="form-input form-textarea" value={content.description || ''} onChange={e => updateContent('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">궤도 아이템 (아이콘 + 라벨)</label>
            {(content.orbit_items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
                <input className="form-input" style={{ width: '60px' }} value={item.icon} onChange={e => {
                  const items = [...(content.orbit_items || [])];
                  items[i] = { ...items[i], icon: e.target.value };
                  updateContent('orbit_items', items);
                }} placeholder="😀" />
                <input className="form-input" style={{ flex: 1 }} value={item.label} onChange={e => {
                  const items = [...(content.orbit_items || [])];
                  items[i] = { ...items[i], label: e.target.value };
                  updateContent('orbit_items', items);
                }} placeholder="라벨" />
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => {
                  updateContent('orbit_items', (content.orbit_items || []).filter((_, idx) => idx !== i));
                }}>✕</button>
              </div>
            ))}
            <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => {
              updateContent('orbit_items', [...(content.orbit_items || []), { icon: '⭐', label: '새 항목' }]);
            }}>➕ 아이템 추가</button>
          </div>
          {renderCTAButtons(content.cta_buttons)}
        </>
      );

    case 'services':
      return (
        <div className="form-group">
          <label className="form-label">서비스 항목</label>
          {(content.items || []).map((item, i) => (
            <div key={i} className="admin-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <input className="form-input" style={{ width: '60px' }} value={item.icon} onChange={e => updateItemField(i, 'icon', e.target.value)} placeholder="😀" />
                <input className="form-input" style={{ flex: 1 }} value={item.title} onChange={e => updateItemField(i, 'title', e.target.value)} placeholder="서비스명" />
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
              </div>
              <textarea className="form-input form-textarea" style={{ minHeight: '60px' }} value={item.description} onChange={e => updateItemField(i, 'description', e.target.value)} placeholder="서비스 설명" />
            </div>
          ))}
          <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => addItem({ icon: '⭐', title: '', description: '' })}>
            ➕ 서비스 추가
          </button>
        </div>
      );

    case 'resources':
      return (
        <div className="form-group">
          <label className="form-label">자료 목록</label>
          {(content.items || []).map((item, i) => (
            <div key={i} className="admin-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <input className="form-input" style={{ flex: 1 }} value={item.title} onChange={e => updateItemField(i, 'title', e.target.value)} placeholder="자료 제목" />
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
              </div>
              <input className="form-input" style={{ marginBottom: 'var(--space-sm)' }} value={item.description || ''} onChange={e => updateItemField(i, 'description', e.target.value)} placeholder="자료 설명" />
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input className="form-input" style={{ flex: 1 }} value={item.file_url || ''} onChange={e => updateItemField(i, 'file_url', e.target.value)} placeholder="파일 URL" />
                <select className="form-input" style={{ width: '100px' }} value={item.file_type || 'pdf'} onChange={e => updateItemField(i, 'file_type', e.target.value)}>
                  <option value="pdf">PDF</option>
                  <option value="doc">DOC</option>
                  <option value="xlsx">XLSX</option>
                  <option value="pptx">PPTX</option>
                </select>
              </div>
            </div>
          ))}
          <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => addItem({ title: '', description: '', file_url: '', file_type: 'pdf' })}>
            ➕ 자료 추가
          </button>
        </div>
      );

    case 'testimonials':
      return (
        <div className="form-group">
          <label className="form-label">후기 목록</label>
          {(content.items || []).map((item, i) => (
            <div key={i} className="admin-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <input className="form-input" style={{ flex: 1 }} value={item.name} onChange={e => updateItemField(i, 'name', e.target.value)} placeholder="고객명" />
                <input className="form-input" style={{ flex: 1 }} value={item.company} onChange={e => updateItemField(i, 'company', e.target.value)} placeholder="회사명" />
                <select className="form-input" style={{ width: '80px' }} value={item.rating || 5} onChange={e => updateItemField(i, 'rating', parseInt(e.target.value))}>
                  {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}점</option>)}
                </select>
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
              </div>
              <textarea className="form-input form-textarea" style={{ minHeight: '60px' }} value={item.text} onChange={e => updateItemField(i, 'text', e.target.value)} placeholder="후기 내용" />
            </div>
          ))}
          <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => addItem({ name: '', company: '', text: '', rating: 5 })}>
            ➕ 후기 추가
          </button>
        </div>
      );

    case 'faq':
      return (
        <div className="form-group">
          <label className="form-label">FAQ 목록</label>
          {(content.items || []).map((item, i) => (
            <div key={i} className="admin-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
                <input className="form-input" style={{ flex: 1 }} value={item.question} onChange={e => updateItemField(i, 'question', e.target.value)} placeholder="질문" />
                <button className="admin-btn admin-btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
              </div>
              <textarea className="form-input form-textarea" style={{ minHeight: '60px' }} value={item.answer} onChange={e => updateItemField(i, 'answer', e.target.value)} placeholder="답변" />
            </div>
          ))}
          <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => addItem({ question: '', answer: '' })}>
            ➕ FAQ 추가
          </button>
        </div>
      );

    case 'cta':
      return (
        <>
          <div className="form-group">
            <label className="form-label">CTA 헤드라인</label>
            <input className="form-input" value={content.headline || ''} onChange={e => updateContent('headline', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">CTA 설명</label>
            <textarea className="form-input form-textarea" value={content.description || ''} onChange={e => updateContent('description', e.target.value)} />
          </div>
          {renderCTAButtons(content.cta_buttons)}
        </>
      );

    case 'gallery':
      return (
        <div className="form-group">
          <label className="form-label">이미지 목록</label>
          {(content.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
              <input className="form-input" style={{ flex: 1 }} value={item.image_url || ''} onChange={e => updateItemField(i, 'image_url', e.target.value)} placeholder="이미지 URL" />
              <input className="form-input" style={{ flex: 1 }} value={item.caption || ''} onChange={e => updateItemField(i, 'caption', e.target.value)} placeholder="설명" />
              <button className="admin-btn admin-btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
            </div>
          ))}
          <button className="admin-btn admin-btn-secondary btn-sm" onClick={() => addItem({ image_url: '', caption: '' })}>
            ➕ 이미지 추가
          </button>
        </div>
      );

    case 'text':
      return (
        <div className="form-group">
          <label className="form-label">본문 텍스트</label>
          <textarea
            className="form-input form-textarea"
            style={{ minHeight: '200px' }}
            value={content.body || ''}
            onChange={e => updateContent('body', e.target.value)}
            placeholder="자유롭게 텍스트를 입력하세요"
          />
        </div>
      );

    default:
      return <p style={{ color: 'var(--admin-text-secondary)' }}>지원되지 않는 섹션 타입입니다.</p>;
  }
}
