# EasyPaper Store

全局状态管理，使用 Zustand 实现。

## 品牌信息 Store

### 使用方法

```typescript
import { useBrandStore } from '@/store'

function MyComponent() {
  // 获取品牌信息
  const brandInfo = useBrandStore((state) => state.brandInfo)

  // 获取更新函数
  const updateBrandInfo = useBrandStore((state) => state.updateBrandInfo)

  // 更新品牌信息
  const handleUpdate = () => {
    updateBrandInfo({
      name: 'New Brand Name',
      tagline: 'New Tagline',
    })
  }

  return (
    <div>
      <h1>{brandInfo?.name}</h1>
      <p>{brandInfo?.tagline}</p>
      <button onClick={handleUpdate}>Update</button>
    </div>
  )
}
```

## Store 结构

### 品牌信息 (Brand Info)
- `brandInfo`: 当前品牌信息
- `setBrandInfo()`: 设置完整的品牌信息
- `updateBrandInfo()`: 部分更新品牌信息

### 产品 (Products)
- `products`: 产品列表
- `addProduct()`: 添加产品
- `updateProduct()`: 更新产品
- `removeProduct()`: 删除产品

### 竞品 (Competitors)
- `competitors`: 竞品列表
- `addCompetitor()`: 添加竞品
- `updateCompetitor()`: 更新竞品
- `removeCompetitor()`: 删除竞品

### 关键信息 (Key Messages)
- `keyMessages`: 关键信息列表
- `addKeyMessage()`: 添加关键信息
- `updateKeyMessage()`: 更新关键信息
- `removeKeyMessage()`: 删除关键信息

### 设置 (Settings)
- `settings`: 品牌设置
- `updateSettings()`: 更新设置

### 其他
- `reset()`: 重置所有状态到默认值

## 数据持久化

所有数据会自动保存到 localStorage，刷新页面后会自动恢复。

## 性能优化

使用选择器来避免不必要的重新渲染：

```typescript
// ❌ 不推荐 - 会在任何状态变化时重新渲染
const store = useBrandStore()

// ✅ 推荐 - 只在 brandInfo 变化时重新渲染
const brandInfo = useBrandStore((state) => state.brandInfo)

// ✅ 推荐 - 只在 products 变化时重新渲染
const products = useBrandStore((state) => state.products)
```

## 示例：完整的品牌信息管理

```typescript
import { useBrandStore } from '@/store'
import type { BrandInfo } from '@/store'

function BrandManagement() {
  const brandInfo = useBrandStore((state) => state.brandInfo)
  const updateBrandInfo = useBrandStore((state) => state.updateBrandInfo)
  const products = useBrandStore((state) => state.products)
  const addProduct = useBrandStore((state) => state.addProduct)

  const handleSave = (data: Partial<BrandInfo>) => {
    updateBrandInfo(data)
  }

  const handleAddProduct = () => {
    addProduct({
      id: Date.now().toString(),
      name: 'New Product',
      category: 'Cloud Storage',
      description: '',
      status: 'active',
      visibilityScore: 0,
      mentions: 0,
      citations: 0,
    })
  }

  return (
    <div>
      <h1>{brandInfo?.name}</h1>
      <button onClick={handleAddProduct}>Add Product</button>
      <div>
        {products.map(product => (
          <div key={product.id}>{product.name}</div>
        ))}
      </div>
    </div>
  )
}
```
