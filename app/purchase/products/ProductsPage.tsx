"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building,
  Cable,
  Camera,
  ChevronDown,
  Edit,
  Grid3X3,
  Monitor,
  Package,
  Plus,
  Search,
  Server,
  Shield,
  ShoppingCart,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import api from "@/lib/api";

function ProductModal({
  isOpen,
  onClose,
  product,
  collectionName,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  collectionName: string;
  onSave: (product: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price || "",
    description: product?.description || "",
  });

  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || "",
        description: product.description || "",
      });
    } else {
      setFormData({ name: "", price: "", description: "" });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...product,
      ...formData,
      price: parseFloat(formData.price) || 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {product ? "Edit Product" : "Add New Product"}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {product ? "Update" : "Add"} Product
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function ProductsPage({ onBack }: { onBack: () => void }) {
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const collectionConfig = [
    {
      id: "nvr",
      name: "NVR Collection",
      endpoint: "/nvrs",
      icon: Server,
      color: "blue",
      description: "Network Video Recorders",
    },
    {
      id: "camera",
      name: "Camera Collection",
      endpoint: "/cameras",
      icon: Camera,
      color: "green",
      description: "IP Security Cameras",
    },
    {
      id: "switch",
      name: "Switch Collection",
      endpoint: "/switches",
      icon: Package,
      color: "purple",
      description: "Network Switches",
    },
    {
      id: "rack",
      name: "Rack Collection",
      endpoint: "/racks",
      icon: Building,
      color: "orange",
      description: "Server Racks",
    },
    {
      id: "pole",
      name: "Pole Collection",
      endpoint: "/poles",
      icon: Building,
      color: "gray",
      description: "Mounting Poles",
    },
    {
      id: "weatherproof",
      name: "Weatherproof Collection",
      endpoint: "/weatherproof-boxes",
      icon: Shield,
      color: "teal",
      description: "Weatherproof Boxes",
    },
    {
      id: "cable",
      name: "Cable Collection",
      endpoint: "/cables",
      icon: Cable,
      color: "indigo",
      description: "Network Cables",
    },
    {
      id: "conduit",
      name: "Conduit Collection",
      endpoint: "/conduits",
      icon: Cable,
      color: "pink",
      description: "Cable Conduits",
    },
    {
      id: "wire",
      name: "Wire Collection",
      endpoint: "/wires",
      icon: Zap,
      color: "yellow",
      description: "Power Wires",
    },
    {
      id: "ups",
      name: "UPS Collection",
      endpoint: "/upss",
      icon: Zap,
      color: "red",
      description: "UPS Systems",
    },
    {
      id: "lcd",
      name: "LCD Collection",
      endpoint: "/lcds",
      icon: Monitor,
      color: "cyan",
      description: "LCD Monitors",
    },
  ];

  useEffect(() => {
    fetchAllCollections();
  }, []);

  const fetchAllCollections = async () => {
    try {
      const results = await Promise.all(
        collectionConfig.map(async (cfg) => {
          const res = await api.get(cfg.endpoint);
          return {
            ...cfg,
            products: (res.data.data || []).map((item: any) => ({
              id: item.id,
              ...item, // spread the root fields
            })),
          };
        })
      );
      setCollections(results);
      return results; // 👈 return the new data
    } catch (err) {
      console.error("❌ Error fetching collections:", err);
      return [];
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (product: number) => {
    console.log("delete", product);
    try {
      const cfg = collectionConfig.find((c) => c.id === selectedCollection.id);
      if (!cfg) return;

      // await api.delete(`${cfg.endpoint}/${product.id}`);

      await api.delete(`${cfg.endpoint}/${product.documentId}`);

      // Refresh collections after delete
      const updated = await fetchAllCollections();
      const newSelected = updated.find((c) => c.id === selectedCollection.id);
      setSelectedCollection(newSelected || null);
    } catch (err) {
      console.error("❌ Error deleting product:", err);
    }
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      const cfg = collectionConfig.find((c) => c.id === selectedCollection.id);
      if (!cfg) return;

      const payload: any = {
        name: productData.name,
        price: productData.price,
        // description: productData.description,
      };

      console.log("data", productData);

      if (editingProduct) {
        await api.put(`${cfg.endpoint}/${editingProduct.documentId}`, {
          data: payload,
        });
      } else {
        await api.post(cfg.endpoint, { data: payload });
      }

      // Refresh collections after save
      const updated = await fetchAllCollections();
      const newSelected = updated.find((c) => c.id === selectedCollection.id);
      setSelectedCollection(newSelected || null);
    } catch (err) {
      console.error("❌ Error saving product:", err);
    }
  };

  if (selectedCollection) {
    const IconComponent = selectedCollection.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <button
              onClick={() => setSelectedCollection(null)}
              className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <div
                className={`p-4 bg-${selectedCollection.color}-100 rounded-xl`}
              >
                <IconComponent
                  className={`w-8 h-8 text-${selectedCollection.color}-600`}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {selectedCollection.name}
                </h1>
                <p className="text-gray-600">
                  {selectedCollection.description}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6 mb-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left side: search + count */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <span className="text-sm text-gray-500 lg:text-center sm:text-left">
                  {selectedCollection.products.length} products
                </span>
              </div>

              {/* Right side: add product button */}
              <div className="flex sm:justify-end">
                <button
                  onClick={handleAddProduct}
                  className="flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              </div>
            </div>
          </motion.div>

          {/* Products Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {selectedCollection.products.map(
                (product: any, index: number) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {product.name}
                          </h3>
                          {/* <p className="text-sm text-gray-600 mb-3">
                            {product.description}
                          </p> */}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-green-600">
                          ₹
                          {product.price ? product.price.toLocaleString() : "0"}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </motion.div>

          {selectedCollection.products.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first product to this collection
              </p>
              <button
                onClick={handleAddProduct}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Product
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <ProductModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              product={editingProduct}
              collectionName={selectedCollection.name}
              onSave={handleSaveProduct}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Product Collections
            </h1>
            <p className="text-xl text-gray-600">
              Manage your security system products
            </p>
          </div>
          {/* <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to BOQ
          </button> */}
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6 mb-8"
        >
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search collections..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Collections Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredCollections.map((collection, index) => {
              const IconComponent = collection.icon;
              return (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedCollection(collection)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                >
                  <div
                    className={`h-2 bg-gradient-to-r from-${collection.color}-400 to-${collection.color}-600`}
                  ></div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`p-3 bg-${collection.color}-100 rounded-xl group-hover:scale-110 transition-transform duration-200`}
                      >
                        <IconComponent
                          className={`w-6 h-6 text-${collection.color}-600`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-gray-900">
                          {collection.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">
                      {collection.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {collection.products.length} products
                      </span>
                      <div className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform duration-200">
                        <span className="text-sm font-medium">View</span>
                        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredCollections.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No collections found
            </h3>
            <p className="text-gray-500">Try adjusting your search terms</p>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16"
        >
          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {collections.reduce((sum, c) => sum + c.products.length, 0)}{" "}
              Products
            </h3>
            <p className="text-gray-600 text-sm">Across all collections</p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {collections.length} Collections
            </h3>
            <p className="text-gray-600 text-sm">Product categories</p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Easy Management
            </h3>
            <p className="text-gray-600 text-sm">Add, edit, delete products</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
