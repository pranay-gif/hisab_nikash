'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    businessName: 'Yummy Eats',
    businessPhone: '',
    businessAddress: '',
    currencySymbol: '₹'
  });
  
  const [products, setProducts] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: 'Plate',
    defaultPrice: '',
    category: 'Food'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, productsRes] = await Promise.all([
        api.get('/settings').catch(() => ({ data: {} })),
        api.get('/products').catch(() => ({ data: [] }))
      ]);
      
      if (settingsRes.data && Object.keys(settingsRes.data).length > 0) {
        setSettings({ ...settings, ...settingsRes.data });
      }
      
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.products || []);
      
      // Default expense categories display
      setExpenseCategories([
        { _id: '1', name: 'Ingredients & Raw Materials' },
        { _id: '2', name: 'Utilities (Gas, Electricity)' },
        { _id: '3', name: 'Staff Salary' },
        { _id: '4', name: 'Rent' },
        { _id: '5', name: 'Miscellaneous' }
      ]);
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/settings', settings);
      showToast('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...newProduct,
        defaultPrice: Number(newProduct.defaultPrice)
      });
      setNewProduct({ name: '', unit: 'Plate', defaultPrice: '', category: 'Food' });
      showToast('Product added successfully!');
      
      // Refresh products
      const res = await api.get('/products');
      setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p._id !== id));
      showToast('Product deleted');
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="diary-section relative max-w-5xl mx-auto">
      {toastMessage && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-2 rounded shadow-md z-50">
          {toastMessage}
        </div>
      )}

      <div className="page-header mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage business profile and product catalog</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Settings */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 border-b border-subtle pb-2">Business Profile</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="form-group">
              <label className="label">Business Name</label>
              <input 
                type="text" 
                className="input w-full"
                value={settings.businessName}
                onChange={e => setSettings({...settings, businessName: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="label">Business Phone</label>
              <input 
                type="text" 
                className="input w-full"
                value={settings.businessPhone}
                onChange={e => setSettings({...settings, businessPhone: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="label">Business Address</label>
              <textarea 
                className="input w-full resize-none"
                rows={3}
                value={settings.businessAddress}
                onChange={e => setSettings({...settings, businessAddress: e.target.value})}
              ></textarea>
            </div>
            <div className="form-group">
              <label className="label">Currency Symbol</label>
              <input 
                type="text" 
                className="input w-full max-w-[100px]"
                value={settings.currencySymbol}
                onChange={e => setSettings({...settings, currencySymbol: e.target.value})}
              />
            </div>
            <div className="pt-2">
              <button type="submit" className="btn-primary w-full">Save Business Settings</button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          {/* Product Catalog */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4 border-b border-subtle pb-2">Product Catalog</h2>
            
            <form onSubmit={handleAddProduct} className="mb-6 bg-surface p-4 rounded border border-subtle">
              <h3 className="font-semibold mb-3 text-sm text-muted uppercase">Add New Product</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="form-group col-span-2 sm:col-span-1">
                  <label className="label text-xs">Name</label>
                  <input type="text" required className="input w-full text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
                <div className="form-group col-span-2 sm:col-span-1">
                  <label className="label text-xs">Category</label>
                  <input type="text" className="input w-full text-sm" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Unit (e.g. Plate, Kg)</label>
                  <input type="text" className="input w-full text-sm" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Default Price (₹)</label>
                  <input type="number" required min="0" step="0.01" className="input w-full text-sm" value={newProduct.defaultPrice} onChange={e => setNewProduct({...newProduct, defaultPrice: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn-primary py-1 px-3 text-sm">+ Add Product</button>
            </form>

            <div className="max-h-[300px] overflow-y-auto pr-2">
              {products.length === 0 ? (
                <p className="text-muted text-sm text-center py-4">No products added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {products.map(product => (
                    <li key={product._id} className="flex justify-between items-center p-3 border border-subtle rounded bg-base hover:bg-hover">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted">{product.category} • {formatCurrency(product.defaultPrice || 0)} / {product.unit}</div>
                      </div>
                      <button 
                        className="text-red-500 hover:bg-red-50 p-2 rounded text-sm transition-colors"
                        onClick={() => handleDeleteProduct(product._id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4 border-b border-subtle pb-2">Expense Categories</h2>
            <p className="text-sm text-muted mb-4">Standard categories for expense tracking.</p>
            <div className="flex flex-wrap gap-2">
              {expenseCategories.map(cat => (
                <span key={cat._id} className="bg-surface border border-subtle px-3 py-1 rounded-full text-sm">
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
