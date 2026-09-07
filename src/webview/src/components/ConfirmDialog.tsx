import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, message, onCancel, onConfirm }) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title="Confirm deletion"
    footer={
      <>
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
        <button className="btn danger" onClick={onConfirm}>Delete</button>
      </>
    }
  >
    <p>{message}</p>
  </Modal>
);

export default ConfirmDialog;
