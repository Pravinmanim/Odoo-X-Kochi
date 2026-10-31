import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import { customersApi } from '../../api/customers.js';
import { productsApi } from '../../api/products.js';
import { plansApi } from '../../api/subscriptions.js';
import api, { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Plus, Trash2, Calculator, Layers, FileSpreadsheet } from 'lucide-react';

const createSubFormSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  plan_id: z.string().min(1, 'Please select a subscription plan'),
  start_date: z.string().min(1, 'Start date is required'),
  expiry_date: z.string().optional(),
  payment_terms: z.coerce.number().int().min(0).default(30),
  lines: z
    .array(
      z.object({
        product_id: z.string().min(1, 'Product is required'),
        variant_id: z.string().optional(),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
      })
    )
    .min(1, 'At least one product line is required'),
});

export function CreateSubscriptionModal({ isOpen, onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error: toastError, success } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSubFormSchema),
    defaultValues: {
      customer_id: '',
      plan_id: '',
      start_date: todayStr,
      expiry_date: '',
      payment_terms: 30,
      lines: [{ product_id: '', variant_id: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  // Watch fields for live calculated pricing preview
  const watchedLines = watch('lines', []);
  const watchedPlanId = watch('plan_id');

  useEffect(() => {
    async function loadMetadata() {
      setIsLoadingMeta(true);
      try {
        const [custRes, prodRes, plansRes, tplRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          productsApi.list({ limit: 100 }),
          plansApi.list(),
          api.get('/templates').catch(() => ({ data: { data: [] } })),
        ]);

        setCustomers(custRes.data || []);
        setProducts(prodRes.data || []);
        setPlans(plansRes.data || []);
        setTemplates(tplRes.data?.data || []);

        if (plansRes.data?.length > 0) {
          setValue('plan_id', plansRes.data[0].id);
        }
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoadingMeta(false);
      }
    }

    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen, setValue, toastError]);

  // Handle template selection
  const handleApplyTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (tpl && tpl.lines?.length > 0) {
      const templateLines = tpl.lines.map((tl) => ({
        product_id: tl.product_id,
        variant_id: tl.variant_id || '',
        quantity: tl.quantity || 1,
      }));
      setValue('lines', templateLines);
      success(`Applied "${tpl.name}" template with ${templateLines.length} product lines.`);
    }
  };

  // Calculate live preview total from backend product prices
  let liveSubtotal = 0;
  const lineDetails = watchedLines.map((line) => {
    const product = products.find((p) => p.id === line.product_id);
    if (!product) return { unitPrice: 0, subtotal: 0, variants: [] };

    let extra = 0;
    if (line.variant_id) {
      const variant = product.variants?.find((v) => v.id === line.variant_id);
      if (variant) extra = Number(variant.extra_price || 0);
    }

    const unitPrice = Number(product.sales_price || 0) + extra;
    const quantity = Math.max(1, Number(line.quantity || 1));
    const subtotal = unitPrice * quantity;
    liveSubtotal += subtotal;

    return {
      unitPrice,
      subtotal,
      variants: product.variants || [],
    };
  });

  const selectedPlan = plans.find((p) => p.id === watchedPlanId);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await onCreated(data);
      reset();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Create New Subscription"
      description="Draft a recurring subscription order, assign client and plan, and configure product lines"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Optional Template Starter */}
        {templates.length > 0 && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-indigo-900 text-xs font-medium">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Speed up drafting by applying a Quotation Template:</span>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="text-xs bg-white border border-indigo-200 rounded px-2.5 py-1 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Choose template (optional) --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.lines?.length || 0} lines)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Customer & Plan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Customer"
            placeholder="Select subscriber customer"
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.name} ${c.company ? `(${c.company})` : ''}`,
            }))}
            error={errors.customer_id?.message}
            required
            {...register('customer_id')}
          />

          <div>
            <Select
              label="Billing Plan"
              placeholder="Select billing frequency & plan"
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} - ${p.billing_period} ($${Number(p.price).toFixed(2)})`,
              }))}
              error={errors.plan_id?.message}
              required
              {...register('plan_id')}
            />
            {selectedPlan && (
              <p className="text-[11px] text-slate-500 mt-1">
                Period: <span className="font-semibold text-slate-700">{selectedPlan.billing_period}</span> • Min Qty:{' '}
                <span className="font-semibold text-slate-700">{selectedPlan.min_quantity}</span> • Pausable:{' '}
                {selectedPlan.pausable ? 'Yes' : 'No'}
              </p>
            )}
          </div>
        </div>

        {/* Schedule & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            error={errors.start_date?.message}
            required
            {...register('start_date')}
          />

          <Input
            label="Expiry Date (Optional)"
            type="date"
            helperText="Auto-computed if left empty"
            error={errors.expiry_date?.message}
            {...register('expiry_date')}
          />

          <Input
            label="Payment Terms (Days)"
            type="number"
            placeholder="30"
            error={errors.payment_terms?.message}
            {...register('payment_terms')}
          />
        </div>

        {/* Product Lines Section */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Subscription Lines</h4>
              <p className="text-xs text-slate-500">
                Products and quantities included in this recurring order
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => append({ product_id: '', variant_id: '', quantity: 1 })}
            >
              Add Line
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const details = lineDetails[index] || { unitPrice: 0, subtotal: 0, variants: [] };
              const currentProductId = watch(`lines.${index}.product_id`);
              const currentProduct = products.find((p) => p.id === currentProductId);
              const availableVariants = currentProduct?.variants || [];

              return (
                <div
                  key={field.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  {/* Product Picker */}
                  <div className="flex-1 w-full">
                    <select
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      {...register(`lines.${index}.product_id`)}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} (${Number(prod.sales_price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    {errors.lines?.[index]?.product_id && (
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {errors.lines[index].product_id.message}
                      </p>
                    )}
                  </div>

                  {/* Variant Picker (if product has variants) */}
                  <div className="w-full sm:w-44">
                    <select
                      disabled={availableVariants.length === 0}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      {...register(`lines.${index}.variant_id`)}
                    >
                      <option value="">
                        {availableVariants.length === 0 ? 'No variants' : 'Standard / Base'}
                      </option>
                      {availableVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.attribute} (+${Number(v.extra_price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-full sm:w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      {...register(`lines.${index}.quantity`)}
                    />
                  </div>

                  {/* Calculated Price Display */}
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-xs text-indigo-700 font-medium shrink-0 min-w-28 justify-end">
                    <span>${details.subtotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {errors.lines && typeof errors.lines.message === 'string' && (
            <p className="text-xs text-rose-600 font-medium mt-2">{errors.lines.message}</p>
          )}

          {/* Live Calculated Total Banner */}
          <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Calculated Order Total (Server Price Resolution):
            </span>
            <span className="text-base font-bold text-slate-900 font-mono">
              ${liveSubtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Subscription (Draft)
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateSubscriptionModal;
