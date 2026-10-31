import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import { Plus, Trash2, Calculator } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').trim(),
  description: z.string().optional(),
  sales_price: z.coerce.number().min(0, 'Sales price cannot be negative'),
  is_active: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        attribute: z.string().min(1, 'Attribute description is required').trim(),
        extra_price: z.coerce.number().min(0, 'Extra price cannot be negative').default(0),
      })
    )
    .optional()
    .default([]),
});

export function ProductModal({ isOpen, onClose, onSave, product = null, isLoading = false }) {
  const isEditing = !!product;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sales_price: 0,
      is_active: true,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const currentSalesPrice = Number(watch('sales_price', 0)) || 0;
  const currentVariants = watch('variants', []);

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        description: product.description || '',
        sales_price: Number(product.sales_price) || 0,
        is_active: product.is_active ?? true,
        variants: (product.variants || []).map((v) => ({
          id: v.id,
          attribute: v.attribute,
          extra_price: Number(v.extra_price) || 0,
        })),
      });
    } else {
      reset({
        name: '',
        description: '',
        sales_price: 0,
        is_active: true,
        variants: [],
      });
    }
  }, [product, reset, isOpen]);

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit Product' : 'Create New Product'}
      description="Define product details, base sales price, and optional configurable variants"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            placeholder="e.g. Cloud Workspace Pro"
            error={errors.name?.message}
            required
            {...register('name')}
          />

          <Input
            label="Base Sales Price ($)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.sales_price?.message}
            required
            {...register('sales_price')}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Brief overview of features, inclusions, and terms..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 font-medium mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            {...register('is_active')}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Active for sales and subscriptions
          </label>
        </div>

        {/* Variants Section */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Product Variants</h4>
              <p className="text-xs text-slate-500">
                Attributes with extra pricing (final price calculated on backend)
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => append({ attribute: '', extra_price: 0 })}
            >
              Add Variant
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              No variants defined. This product will be sold at its base price ($
              {currentSalesPrice.toFixed(2)}).
            </div>
          ) : (
            <div className="space-y-2.5">
              {fields.map((field, index) => {
                const extraPrice = Number(currentVariants[index]?.extra_price || 0);
                const finalCalc = (currentSalesPrice + extraPrice).toFixed(2);

                return (
                  <div
                    key={field.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="flex-1 w-full">
                      <input
                        placeholder="Attribute (e.g. Storage: 256GB)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        {...register(`variants.${index}.attribute`)}
                      />
                      {errors.variants?.[index]?.attribute && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.variants[index].attribute.message}
                        </p>
                      )}
                    </div>

                    <div className="w-full sm:w-36">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">+$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Extra $"
                          className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          {...register(`variants.${index}.extra_price`)}
                        />
                      </div>
                      {errors.variants?.[index]?.extra_price && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.variants[index].extra_price.message}
                        </p>
                      )}
                    </div>

                    {/* Calculated final price preview badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-xs text-indigo-700 font-medium shrink-0">
                      <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Total: ${finalCalc}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ProductModal;

