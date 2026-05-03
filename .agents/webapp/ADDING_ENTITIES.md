# Adding Entities to Webapp

> **Guide**: How to add new business entities to the frontend  
> **Architecture**: Feature-Sliced Design (FSD)  

---

## Quick Overview

Entities represent business domains (e.g., Game, User, Product). Each entity has:
- **Model**: Types, constants, utilities
- **API**: API methods, React Query hooks
- **UI**: Entity-specific components (optional)

---

## Step-by-Step Guide

### Step 1: Create Entity Folder

```bash
mkdir -p webapp/src/entities/{entity-name}/{model,api,ui}
```

Example:
```bash
mkdir -p webapp/src/entities/product/{model,api,ui}
```

---

### Step 2: Define Model (Types)

**File**: `entities/product/model/types.ts`

```typescript
// Basic entity type
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  createdAt: string;
}

// DTOs for API
export interface CreateProductDto {
  name: string;
  price: number;
  description?: string;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  description?: string;
}
```

---

### Step 3: Define Constants

**File**: `entities/product/model/constants.ts`

```typescript
export const PRODUCT_CATEGORIES = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'food', label: 'Food' },
] as const;

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];
```

---

### Step 4: Add Utilities (Optional)

**File**: `entities/product/model/utilities.ts`

```typescript
// Format price with currency
export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

// Get category label by ID
export const getCategoryLabel = (categoryId: string): string => {
  const category = PRODUCT_CATEGORIES.find(c => c.id === categoryId);
  return category?.label || 'Unknown';
};
```

---

### Step 5: Export Model

**File**: `entities/product/model/index.ts`

```typescript
export * from './types';
export * from './constants';
export * from './utilities';
```

---

### Step 6: Create API Methods

**File**: `entities/product/api/productApi.ts`

```typescript
import { apiClient } from '@/shared/api';
import type { 
  Product, 
  CreateProductDto, 
  UpdateProductDto 
} from '../model';

export const productApi = {
  // Get all products
  getProducts: () => 
    apiClient.get<Product[]>('/products'),

  // Get single product
  getProduct: (id: string) => 
    apiClient.get<Product>(`/products/${id}`),

  // Create product
  createProduct: (data: CreateProductDto) => 
    apiClient.post<Product>('/products', data),

  // Update product
  updateProduct: (id: string, data: UpdateProductDto) => 
    apiClient.patch<Product>(`/products/${id}`, data),

  // Delete product
  deleteProduct: (id: string) => 
    apiClient.delete<void>(`/products/${id}`),
};
```

---

### Step 7: Create React Query Hooks

**File**: `entities/product/api/queries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from './productApi';

// Query keys for cache management
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

// Get all products
export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => productApi.getProducts(),
  });
};

// Get single product
export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: productKeys.detail(id || ''),
    queryFn: () => productApi.getProduct(id!),
    enabled: !!id, // Only fetch if id exists
  });
};

// Create product
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

// Update product
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productApi.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific product and list
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

// Delete product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
```

---

### Step 8: Export API

**File**: `entities/product/api/index.ts`

```typescript
export { productApi } from './productApi';
export {
  productKeys,
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './queries';
```

---

### Step 9: Add UI Components (Optional)

**File**: `entities/product/ui/ProductCard/ProductCard.tsx`

```typescript
import React from 'react';
import { Card, CardContent } from '@/shared/ui';
import { formatPrice } from '../model';
import type { Product } from '../model';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  return (
    <Card onClick={onClick} className="cursor-pointer">
      <CardContent className="p-4">
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-telegram-hint">{formatPrice(product.price)}</p>
      </CardContent>
    </Card>
  );
};
```

**File**: `entities/product/ui/ProductCard/index.ts`

```typescript
export { ProductCard } from './ProductCard';
```

**File**: `entities/product/ui/index.ts`

```typescript
export { ProductCard } from './ProductCard';
```

---

### Step 10: Export Entity

**File**: `entities/product/index.ts`

```typescript
// Export model (types, constants, utilities)
export * from './model';

// Export API (methods, hooks)
export * from './api';

// Export UI components
export * from './ui';
```

---

### Step 11: Register in Main Entities Index

**File**: `entities/index.ts`

```typescript
// Add export for new entity
export * from './game';
export * from './user';
export * from './stats';
export * from './admin';
export * from './product';  // <-- Add this
```

---

## Usage Example

### In a Component

```typescript
import React from 'react';
import { 
  useProducts, 
  useCreateProduct,
  ProductCard,
  formatPrice 
} from '@/entities/product';
import { Button, Input } from '@/shared/ui';

export const ProductList: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

### In a Form

```typescript
const handleSubmit = (data: CreateProductDto) => {
  createProduct.mutate(data, {
    onSuccess: () => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    },
  });
};
```

---

## Checklist

- [ ] Created folder structure: `entities/{name}/{model,api,ui}`
- [ ] Defined types in `model/types.ts`
- [ ] Added constants in `model/constants.ts` (if needed)
- [ ] Created utilities in `model/utilities.ts` (if needed)
- [ ] Exported model from `model/index.ts`
- [ ] Created API methods in `api/{name}Api.ts`
- [ ] Created query hooks in `api/queries.ts`
- [ ] Exported API from `api/index.ts`
- [ ] Added UI components in `ui/` (if needed)
- [ ] Exported entity from `entities/{name}/index.ts`
- [ ] Registered in main `entities/index.ts`
- [ ] Tested the build: `npm run webapp:build`

---

## Patterns

### Query Keys Pattern

Always use query keys for cache invalidation:

```typescript
export const entityKeys = {
  all: ['entities'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  detail: (id: string) => [...entityKeys.all, 'detail', id] as const,
};
```

### Mutation Pattern

Always invalidate related queries on mutation:

```typescript
export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createEntity,
    onSuccess: () => {
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
};
```

### Admin Auth Detection Pattern

The app supports two admin auth methods (password bearer token + Telegram `isAdmin`). Use the `useMe` hook to detect Telegram admin status on mount:

```typescript
import { useMe } from '@/entities/user';

const AppContent: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: meData } = useMe();

  useEffect(() => {
    if (meData?.isAdmin) {
      setIsAdmin(true);
    }
  }, [meData]);

  // ...
};
```

The `useMe` hook calls `GET /webapp/me` which returns `{ isAdmin: boolean }`. It works silently in both Telegram and browser environments.

### Type Exports Pattern

Export types with explicit `type` keyword:

```typescript
// Good - explicit type export
export type { Product, CreateProductDto } from './model';

// Or include in star export
export * from './model'; // Types included automatically
```

---

## Adding a New Tab to the Statistics Page

The project has two main statistics UIs that use tabs:
- **`webapp/src/app/App.tsx`** — Main app with tabs (Speakers, Judges, Games, Admin, etc.)
- **`webapp/src/pages/stats/ui/StatsPage.tsx`** — Standalone stats page (legacy/alternative view)

When adding a new tab (e.g., "Темы" / "Motions"), update **both** files to keep them in sync.

### Step 1: Backend API (if new data is needed)

If the tab displays data that is not already fetched:

1. **Add DTO** in `src/webapp/dtos/webapp.dto.ts`:
   ```typescript
   export interface GameMotionDto {
     gameId: string;
     gameName: string;
     motion: string | null;
   }
   ```

2. **Add service method** in `src/webapp/webapp.service.ts`.

3. **Add controller endpoint** in `src/webapp/stats.controller.ts`:
   ```typescript
   @Get('motions')
   async getGameMotions(): Promise<ApiResponse<GameMotionDto[]>> {
     const data = await this.webAppService.getGameMotions();
     return { success: true, data };
   }
   ```

### Step 2: Frontend Entity Layer

1. **Add type** in `webapp/src/entities/stats/model/types.ts`:
   ```typescript
   export interface GameMotion {
     gameId: string;
     gameName: string;
     motion: string | null;
   }
   ```

2. **Export type** from `webapp/src/entities/stats/model/index.ts`.

3. **Add API method** in `webapp/src/entities/stats/api/statsApi.ts`:
   ```typescript
   getGameMotions: () => apiClient.get<GameMotion[]>('/stats/motions'),
   ```

4. **Add query hook** in `webapp/src/entities/stats/api/queries.ts`:
   ```typescript
   export const useGameMotions = () => {
     return useQuery({
       queryKey: statsKeys.motions(),
       queryFn: () => statsApi.getGameMotions(),
       staleTime: 1000 * 60 * 2,
     });
   };
   ```

5. **Export hook** from `webapp/src/entities/stats/api/index.ts`.

### Step 3: Update `App.tsx`

1. **Import the hook**:
   ```typescript
   import { useStats, useGameParticipations, useGameMotions } from '@/entities/stats';
   ```

2. **Extend the `Tab` union type**:
   ```typescript
   type Tab = 'speakers' | 'judges' | 'games' | 'motions' | 'admin';
   ```

3. **Add the tab to the `tabs` array**:
   ```typescript
   const tabs = [
     { id: 'speakers' as Tab, label: 'Спикеры' },
     { id: 'motions' as Tab, label: 'Темы' },
     { id: 'judges' as Tab, label: 'Судьи' },
     { id: 'games' as Tab, label: 'Игры' },
     { id: 'admin' as Tab, label: 'Админка' },
   ];
   ```

4. **Create the content component** (e.g., `MotionsContent`) using the query hook.

5. **Add rendering** in the main return:
   ```typescript
   {activeTab === 'motions' && <MotionsContent />}
   ```

> **Mobile layout**: The app uses a burger menu on small screens (`md:hidden`). New tabs are automatically included in both the desktop tab row (`hidden md:flex`) and the mobile dropdown menu. No extra mobile work is needed when adding a tab.

### Step 4: Update `StatsPage.tsx`

1. **Import the hook**.

2. **Extend `TabValue` union type**.

3. **Call the hook** inside the component.

4. **Update `TabsList`**:
   - Increase `grid-cols-N` to match the new tab count.
   - Add `<TabsTrigger value="motions">Темы ({motions.length})</TabsTrigger>`.

5. **Add `<TabsContent value="motions">`** with the table/content.

6. **Update `isPageLoading`** logic if the new tab loads independently.

### ⚠️ Critical Rules

- **Tab value consistency**: The `value` prop on `<TabsTrigger>` and `<TabsContent>` must match exactly. A mismatch (e.g., trigger `value="motions"` but content `value="themes"`) will silently break the tab.
- **Update both `App.tsx` and `StatsPage.tsx`** unless you know for certain only one is used.
- **Keep `Tab` / `TabValue` types in sync** with the actual `value` strings used in triggers.
- **Mobile overflow is handled** by the burger menu — no need to adjust grid columns in `App.tsx`.

---

## See Also

- `BASE.md` - Webapp architecture overview
- `../api/ADDING_ENTITIES.md` - Adding entities to backend
- `../OVERVIEW.md` - System-wide overview
