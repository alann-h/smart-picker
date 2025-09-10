"use client";

import { api } from "~/trpc/react";

export default function TestPage() {
  const { data: products, isLoading: productsLoading } = api.product.getAll.useQuery();
  const { data: quotes, isLoading: quotesLoading } = api.quote.getAll.useQuery();
  const { data: categories, isLoading: categoriesLoading } = api.product.getCategories.useQuery();
  const { data: userStatus, isLoading: authLoading } = api.auth.getUserStatus.useQuery();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">tRPC API Test Page</h1>
      
      {/* Authentication Status */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        {authLoading ? (
          <p>Loading auth status...</p>
        ) : userStatus ? (
          <div className="text-sm space-y-1">
            <p><strong>Logged in:</strong> Yes</p>
            <p><strong>Name:</strong> {userStatus.name}</p>
            <p><strong>Email:</strong> {userStatus.email}</p>
            <p><strong>Admin:</strong> {userStatus.isAdmin ? "Yes" : "No"}</p>
            <p><strong>Company:</strong> {userStatus.companyName ?? "No company"}</p>
          </div>
        ) : (
          <p className="text-red-600">Not logged in</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          {productsLoading ? (
            <p>Loading products...</p>
          ) : (
            <div>
              <p className="mb-2">Total products: {products?.length}</p>
              {products && products.length > 0 && (
                <div className="text-sm">
                  <p>First product: {products[0]?.productName}</p>
                  <p>SKU: {products[0]?.sku}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quotes Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quotes</h2>
          {quotesLoading ? (
            <p>Loading quotes...</p>
          ) : (
            <div>
              <p className="mb-2">Total quotes: {quotes?.length}</p>
              {quotes && quotes.length > 0 && (
                <div className="text-sm">
                  <p>First quote ID: {quotes[0]?.id}</p>
                  <p>Status: {quotes[0]?.status}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          {categoriesLoading ? (
            <p>Loading categories...</p>
          ) : (
            <div>
              <p className="mb-2">Total categories: {categories?.length}</p>
              {categories && categories.length > 0 && (
                <div className="text-sm">
                  <p>Categories: {categories.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* API Endpoints Info */}
      <div className="mt-8 bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Available API Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Product Endpoints:</h3>
            <ul className="space-y-1">
              <li>• product.getAll</li>
              <li>• product.getByCategory</li>
              <li>• product.search</li>
              <li>• product.getBySku</li>
              <li>• product.getByBarcode</li>
              <li>• product.create</li>
              <li>• product.update</li>
              <li>• product.archive</li>
              <li>• product.getCategories</li>
              <li>• product.bulkUpdate</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Quote Endpoints:</h3>
            <ul className="space-y-1">
              <li>• quote.getAll</li>
              <li>• quote.getByStatus</li>
              <li>• quote.getById</li>
              <li>• quote.create</li>
              <li>• quote.updateStatus</li>
              <li>• quote.updatePickingQuantity</li>
              <li>• quote.getReadyForPicking</li>
              <li>• quote.getReadyForReview</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
