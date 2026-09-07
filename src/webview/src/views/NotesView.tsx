import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { FullState } from '../hooks/useVSCodeMessage';
import { FileText, Trash2, Pin, PinOff, Plus, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';

interface NotesViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const NotesView: React.FC<NotesViewProps> = ({ state, searchTerm, onAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const notes = state.notes as Note[] || [];

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          note.title.toLowerCase().includes(searchLower) || 
          note.content.toLowerCase().includes(searchLower) ||
          note.tags.some(tag => tag.toLowerCase().includes(searchLower));
        return matchesSearch;
      })
      .sort((a, b) => {
        // Pinned first, then by updated date
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, searchTerm]);

  const renderMarkdown = (markdown: string) => (
    <ReactMarkdown>{markdown || 'Nothing to preview yet...'}</ReactMarkdown>
  );

  const openCreateModal = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags('');
    setNotePinned(false);
    setModalMode('create');
    setPreviewMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags.join(', '));
    setNotePinned(note.pinned);
    setModalMode('edit');
    setPreviewMode(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNote(null);
    setPreviewMode(false);
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      closeModal();
      return;
    }

    const tags = noteTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const payload = {
      title: noteTitle.trim() || 'Untitled Note',
      content: noteContent.trim(),
      tags,
      pinned: notePinned,
    };

    if (modalMode === 'create') {
      onAction('addNote', payload);
    } else if (selectedNote) {
      onAction('updateNote', { id: selectedNote.id, patch: payload });
    }

    closeModal();
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Delete this note?')) {
      onAction('deleteNote', { id });
    }
  };

  const togglePin = (id: string, e?: React.MouseEvent, currentPinned?: boolean) => {
    if (e) e.stopPropagation();
    onAction('updateNote', { 
      id, 
      patch: { pinned: !currentPinned } 
    });
  };

  const pinnedCount = notes.filter(n => n.pinned).length;

  return (
    <div className="notes-view">
      <div className="section-head">
        <h2>Notes</h2>
        <div className="count">{notes.length} total • {pinnedCount} pinned</div>
        
        <button 
          className="btn" 
          onClick={openCreateModal}
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={16} /> New Note
        </button>
      </div>

      {filteredNotes.length > 0 ? (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className={`note-card ${note.pinned ? 'pinned' : ''}`}
              onClick={() => openEditModal(note)}
            >
              <button 
                className="icon-btn delete-btn"
                onClick={(e) => handleDeleteNote(note.id, e)}
                title="Delete note"
              >
                <Trash2 size={16} />
              </button>

              <div className="note-card-title">
                {note.pinned && <Pin size={14} style={{ color: 'var(--accent)' }} />}
                {note.title}
              </div>
              
              <div className="note-card-content">
                {renderMarkdown(note.content.substring(0, 140) + (note.content.length > 140 ? '...' : ''))}
              </div>
              
              {note.tags && note.tags.length > 0 && (
                <div className="note-card-tags">
                  {note.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="note-tag">#{tag}</span>
                  ))}
                  {note.tags.length > 3 && <span className="note-tag">+{note.tags.length - 3}</span>}
                </div>
              )}
              
              <div className="note-card-meta">
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                <button 
                  className="icon-btn"
                  onClick={(e) => togglePin(note.id, e, note.pinned)}
                  title={note.pinned ? "Unpin" : "Pin"}
                  style={{ padding: '2px' }}
                >
                  {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText size={48} strokeWidth={1} />
          <p>No notes found.</p>
          {searchTerm && <p style={{ fontSize: '12px' }}>Try a different search term or create a new note.</p>}
          {!searchTerm && (
            <button className="btn" onClick={openCreateModal} style={{ marginTop: '16px' }}>
              Create your first note
            </button>
          )}
        </div>
      )}

      {/* Note Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Note' : 'Edit Note'}
        footer={
          <>
            <button className="btn secondary" onClick={closeModal}>
              Cancel
            </button>
            <button 
              className="btn" 
              onClick={handleSaveNote}
              style={{ background: 'var(--accent)' }}
            >
              {modalMode === 'create' ? 'Create Note' : 'Save Changes'}
            </button>
            {modalMode === 'edit' && (
              <button 
                className="btn secondary" 
                onClick={() => setPreviewMode(!previewMode)}
                style={{ marginRight: 'auto' }}
              >
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            )}
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title..."
            style={{ fontSize: '16px', fontWeight: 600, padding: '10px 12px' }}
          />
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
              />
              Pin this note
            </label>
            
            <input
              type="text"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              placeholder="tags, comma, separated"
              style={{ flex: 1, fontSize: '13px' }}
            />
          </div>

          {previewMode ? (
            <div className="note-preview">
              {renderMarkdown(noteContent)}
            </div>
          ) : (
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note here... Markdown supported (# headers, **bold**, *italic*, - lists)"
              style={{ flex: 1, fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: '13.5px', lineHeight: '1.5' }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default NotesView;
