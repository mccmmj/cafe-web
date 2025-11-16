'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal, Button } from '@/components/ui'
import type { Supplier } from './SuppliersManagement'
import { PURCHASE_ORDER_TEMPLATE_VARIABLES } from '@/lib/purchase-orders/templates'

const DEFAULT_SUBJECT_TEMPLATE = 'Purchase Order {{order_number}}'
const DEFAULT_BODY_TEMPLATE = [
  'Hello {{supplier_contact}},',
  'Please find attached purchase order {{order_number}}.',
  'Expected delivery: {{expected_delivery_date}}',
  '',
  'Thank you,',
  'Little Cafe Purchasing'
].join('\n')

interface SupplierEmailTemplateModalProps {
  supplier: Supplier | null
  isOpen: boolean
  onClose: () => void
}

const SupplierEmailTemplateModal = ({ supplier, isOpen, onClose }: SupplierEmailTemplateModalProps) => {
  const queryClient = useQueryClient()
  const supplierId = supplier?.id
  const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_SUBJECT_TEMPLATE)
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY_TEMPLATE)

  const enabled = Boolean(isOpen && supplierId)

  const { data, isFetching } = useQuery({
    queryKey: ['supplier-email-template', supplierId],
    enabled,
    queryFn: async () => {
      const response = await fetch(`/api/admin/suppliers/${supplierId}/email-templates`)
      if (!response.ok) {
        throw new Error('Failed to load template')
      }
      return response.json()
    }
  })

  useEffect(() => {
    if (!isOpen) {
      setSubjectTemplate(DEFAULT_SUBJECT_TEMPLATE)
      setBodyTemplate(DEFAULT_BODY_TEMPLATE)
      return
    }

    if (data?.template) {
      setSubjectTemplate(data.template.subject_template)
      setBodyTemplate(data.template.body_template)
    } else if (!isFetching) {
      setSubjectTemplate(DEFAULT_SUBJECT_TEMPLATE)
      setBodyTemplate(DEFAULT_BODY_TEMPLATE)
    }
  }, [data, isFetching, isOpen])

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/suppliers/${supplierId}/email-templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_template: subjectTemplate,
          body_template: bodyTemplate
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Default email template saved')
      queryClient.invalidateQueries({ queryKey: ['supplier-email-template', supplierId] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save template')
    }
  })

  const isSaving = saveTemplateMutation.isPending
  const isDisabled = isSaving || isFetching

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? `Email Template — ${supplier.name}` : 'Email Template'}
      size="lg"
    >
      <div className="space-y-5 min-w-0">
        <p className="text-sm text-gray-600">
          Configure the default subject and body for purchase order emails sent to this supplier.
          You can insert placeholders to automatically pull in order details.
        </p>

        <div className="rounded-lg border border-dashed border-gray-200 p-4 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Available variables</p>
          <div className="space-y-2">
            {Object.entries(PURCHASE_ORDER_TEMPLATE_VARIABLES).map(([token, description]) => (
              <div key={token} className="flex items-start gap-2 text-sm text-gray-700">
                <code className="rounded bg-white px-2 py-1 font-semibold text-gray-900 shadow-sm border border-gray-200">
                  {'{{'}{token}{'}}'}
                </code>
                <p className="text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={subjectTemplate}
            onChange={(event) => setSubjectTemplate(event.target.value)}
            disabled={isDisabled}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-70"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700">Body</label>
          <textarea
            rows={8}
            value={bodyTemplate}
            onChange={(event) => setBodyTemplate(event.target.value)}
            disabled={isDisabled}
            className="mt-1 block w-full max-w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-70 resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { saveTemplateMutation.mutate() }}
            disabled={isDisabled}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Template'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SupplierEmailTemplateModal
