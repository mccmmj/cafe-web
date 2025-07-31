'use client'

import { Modal, Button } from '@/components/ui'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}: ConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog