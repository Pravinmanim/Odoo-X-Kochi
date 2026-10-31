import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { productsApi } from '../../api/products.js';
import { getErrorMessage } from '../../api/client.js';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ProductModal from './ProductModal.jsx';
import { Plus, Search, Edit2, Trash2, Package, Layers } from 'lucide-react';

export function ProductListPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  // State
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(
    async (page = 1, searchQuery = search) => {
      setIsLoading(true);
      try {
        const response = await productsApi.list({
          page,
          limit: 20,
          search: searchQuery,
          sort: 'created_at:desc',
        });
        setProducts(response.data || []);
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        });
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [search, toastError]
  );

  useEffect(() => {
    fetchProducts(1, search);
  }, [search, fetchProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data) => {
    setIsSaving(true);
    try {
      if (selectedProduct) {
        await productsApi.update(selectedProduct.id, data);
        success(`Product "${data.name}" updated successfully.`);
      } else {
        await productsApi.create(data);
        success(`Product "${data.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setIsDeleting(true);
    try {
      await productsApi.delete(deleteProductTarget.id);
      success(`Product "${deleteProductTarget.name}" deleted.`);
      setDeleteProductTarget(null);
      fetchProducts(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reference module demonstrating CRUD operations, variants pricing, and role-based permissions
          </p>
        </div>

        {isAdmin && (
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Add Product
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search products by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-center font-medium">
          <span>Role view:</span>
          <Badge status={user?.role} />
          {isAdmin ? (
            <span className="text-slate-400">• Full CRUD</span>
          ) : (
            <span className="text-slate-400">• Read Only</span>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <Loader text="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products available"
          description={
            search
              ? `No products matching "${search}". Try clearing the search query.`
              : 'Get started by creating your first subscription product or add-on.'
          }
          actionLabel={isAdmin ? 'Create Product' : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
          icon={Package}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Product Name' },
              { label: 'Base Sales Price', align: 'right' },
              { label: 'Configurable Variants' },
              { label: 'Status' },
              ...(isAdmin ? [{ label: 'Actions', align: 'right' }] : []),
            ]}
          >
            {products.map((product) => (
              <TableRow key={product.id}>
                {/* Product Name & Description */}
                <TableCell>
                  <div className="font-semibold text-slate-900">{product.name}</div>
                  {product.description && (
                    <p className="text-xs text-slate-500 max-w-md truncate mt-0.5">
                      {product.description}
                    </p>
                  )}
                </TableCell>

                {/* Base Sales Price */}
                <TableCell align="right" className="font-semibold text-slate-900">
                  ${Number(product.sales_price).toFixed(2)}
                </TableCell>

                {/* Configurable Variants */}
                <TableCell>
                  {product.variants && product.variants.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-w-sm">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs text-slate-700 transition-colors"
                          title={`Extra: +$${Number(v.extra_price).toFixed(2)} | Final: $${Number(v.final_price).toFixed(2)}`}
                        >
                          <span className="font-medium">{v.attribute}</span>
                          <span className="text-indigo-600 font-semibold">
                            (${Number(v.final_price).toFixed(2)})
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No variants</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge status={product.is_active ? 'active' : 'draft'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>

                {/* Actions (Admin Only) */}
                {isAdmin && (
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(product)}
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600 hover:text-indigo-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteProductTarget(product)}
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4 text-slate-600 hover:text-rose-600" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </Table>

          {/* Pagination */}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(newPage) => fetchProducts(newPage)}
          />
        </div>
      )}

      {/* Product Form Modal */}
      {isModalOpen && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          product={selectedProduct}
          isLoading={isSaving}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteProductTarget}
        onClose={() => setDeleteProductTarget(null)}
        onConfirm={handleDeleteProduct}
        isLoading={isDeleting}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteProductTarget?.name}"? If this product is referenced by subscriptions or templates, it cannot be deleted.`}
      />
    </div>
  );
}

export default ProductListPage;

