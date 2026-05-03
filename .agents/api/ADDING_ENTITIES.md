# Adding Entities to API

> **Guide**: How to add new business entities to the backend  
> **Architecture**: Clean Architecture + Event-Driven  

---

## Quick Overview

Adding an entity requires files in multiple layers:

```
src/
├── domain/entities/product.entity.ts           # Domain entity
├── domain/value-objects/product-id.vo.ts      # Value objects (optional)
├── domain/repository-interfaces/product.repository.ts  # Repository interface
├── domain/events/product-created.event.ts     # Domain events (optional)
├── application/commands/create-product.command.ts      # Use cases
├── application/queries/get-product.query.ts           # Queries
├── application/dtos/product.dto.ts            # DTOs
├── infrastructure/database/mappers/product.mapper.ts   # TypeORM mapper
├── infrastructure/database/repositories/product.repository.impl.ts
└── presentation/controllers/product.controller.ts      # HTTP handler
```

---

## Step-by-Step Guide

### Step 1: Create Domain Entity

**File**: `domain/entities/product.entity.ts`

```typescript
// Domain entity with business logic
export interface ProductProps {
  id: ProductId;
  name: string;
  price: Money;
  status: ProductStatus;
  createdAt: Date;
}

export class Product {
  private constructor(private props: ProductProps) {}

  // Factory method
  static create(data: CreateProductData): Product {
    return new Product({
      id: ProductId.generate(),
      name: data.name,
      price: new Money(data.price),
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
    });
  }

  // Business methods
  updatePrice(newPrice: Money): void {
    if (newPrice.isNegative()) {
      throw new Error('Price cannot be negative');
    }
    this.props.price = newPrice;
  }

  deactivate(): void {
    if (this.props.status === ProductStatus.DISCONTINUED) {
      throw new Error('Already discontinued');
    }
    this.props.status = ProductStatus.DISCONTINUED;
  }

  // Getters
  get id(): ProductId { return this.props.id; }
  get name(): string { return this.props.name; }
  get price(): Money { return this.props.price; }
  get status(): ProductStatus { return this.props.status; }
}
```

---

### Step 2: Create Value Objects (Optional)

**File**: `domain/value-objects/product-id.vo.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

export class ProductId {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('ProductId cannot be empty');
  }

  static generate(): ProductId {
    return new ProductId(uuidv4());
  }

  static fromString(id: string): ProductId {
    return new ProductId(id);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}
```

**File**: `domain/value-objects/money.vo.ts`

```typescript
export class Money {
  constructor(private readonly cents: number) {
    if (!Number.isInteger(cents)) {
      throw new Error('Money must be in cents (integer)');
    }
  }

  static fromDollars(dollars: number): Money {
    return new Money(Math.round(dollars * 100));
  }

  toDollars(): number {
    return this.cents / 100;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }
}
```

---

### Step 3: Create Repository Interface

**File**: `domain/repository-interfaces/product.repository.ts`

```typescript
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  save(product: Product): Promise<void>;
  findById(id: ProductId): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  delete(id: ProductId): Promise<void>;
}
```

---

### Step 4: Create Domain Events (Optional)

**File**: `domain/events/product-created.event.ts`

```typescript
export class ProductCreatedEvent implements DomainEvent {
  readonly occurredAt = new Date();
  readonly type = 'product.created';

  constructor(
    public readonly productId: ProductId,
    public readonly name: string,
  ) {}
}
```

---

### Step 5: Create Application Commands

**File**: `application/commands/create-product.command.ts`

```typescript
export interface CreateProductData {
  name: string;
  price: number;
}

@Injectable()
export class CreateProductCommand {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private repo: IProductRepository,
    @Inject(EVENT_BUS) private eventBus: IEventBus,
  ) {}

  async execute(data: CreateProductData): Promise<Product> {
    // Business logic
    const product = Product.create(data);
    
    // Persist
    await this.repo.save(product);
    
    // Emit event
    await this.eventBus.publish(
      new ProductCreatedEvent(product.id, product.name)
    );
    
    return product;
  }
}
```

**File**: `application/commands/update-product.command.ts`

```typescript
@Injectable()
export class UpdateProductCommand {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private repo: IProductRepository,
  ) {}

  async execute(
    id: string, 
    data: Partial<UpdateProductData>
  ): Promise<Product> {
    const productId = ProductId.fromString(id);
    const product = await this.repo.findById(productId);
    
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (data.price !== undefined) {
      product.updatePrice(Money.fromDollars(data.price));
    }

    if (data.name !== undefined) {
      product.updateName(data.name);
    }

    await this.repo.save(product);
    return product;
  }
}
```

---

### Step 6: Create Application Queries

**File**: `application/queries/get-product.query.ts`

```typescript
@Injectable()
export class GetProductQuery {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private repo: IProductRepository,
  ) {}

  async byId(id: string): Promise<Product | null> {
    return this.repo.findById(ProductId.fromString(id));
  }

  async all(): Promise<Product[]> {
    return this.repo.findAll();
  }
}
```

---

### Step 7: Create DTOs

**File**: `application/dtos/product.dto.ts`

```typescript
// Request DTOs
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}

// Response DTOs
export class ProductResponseDto {
  id: string;
  name: string;
  price: number;
  status: string;
  createdAt: string;

  static fromDomain(product: Product): ProductResponseDto {
    return {
      id: product.id.toString(),
      name: product.name,
      price: product.price.toDollars(),
      status: product.status,
      createdAt: product.createdAt.toISOString(),
    };
  }
}
```

---

### Step 8: Create TypeORM Entity

**File**: `infrastructure/database/entities/product.orm-entity.ts`

```typescript
@Entity('products')
export class ProductOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('int')
  priceCents: number;

  @Column('enum', { enum: ProductStatus })
  status: ProductStatus;

  @Column('timestamp')
  createdAt: Date;
}
```

> **Adding boolean flags (e.g., `isAdmin`)**: Use `@Column({ type: 'boolean', default: false })`. Always add a corresponding migration — do **not** rely on `synchronize: true`.

---

### Step 9: Create Mapper

**File**: `infrastructure/database/mappers/product.mapper.ts`

```typescript
@Injectable()
export class ProductMapper {
  toDomain(orm: ProductOrmEntity): Product {
    return Product.reconstitute({
      id: ProductId.fromString(orm.id),
      name: orm.name,
      price: new Money(orm.priceCents),
      status: orm.status,
      createdAt: orm.createdAt,
    });
  }

  toOrm(domain: Product): ProductOrmEntity {
    const orm = new ProductOrmEntity();
    orm.id = domain.id.toString();
    orm.name = domain.name;
    orm.priceCents = domain.price.getCents();
    orm.status = domain.status;
    orm.createdAt = domain.createdAt;
    return orm;
  }
}
```

---

### Step 10: Create Repository Implementation

**File**: `infrastructure/database/repositories/product.repository.impl.ts`

```typescript
@Injectable()
export class ProductRepositoryImpl implements IProductRepository {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private ormRepo: Repository<ProductOrmEntity>,
    private mapper: ProductMapper,
  ) {}

  async save(product: Product): Promise<void> {
    const ormEntity = this.mapper.toOrm(product);
    await this.ormRepo.save(ormEntity);
  }

  async findById(id: ProductId): Promise<Product | null> {
    const ormEntity = await this.ormRepo.findOne({
      where: { id: id.toString() },
    });
    return ormEntity ? this.mapper.toDomain(ormEntity) : null;
  }

  async findAll(): Promise<Product[]> {
    const ormEntities = await this.ormRepo.find();
    return ormEntities.map(e => this.mapper.toDomain(e));
  }

  async delete(id: ProductId): Promise<void> {
    await this.ormRepo.delete(id.toString());
  }
}
```

---

### Step 11: Create Controller

**File**: `presentation/controllers/product.controller.ts`

```typescript
@Controller('products')
export class ProductController {
  constructor(
    private createProduct: CreateProductCommand,
    private updateProduct: UpdateProductCommand,
    private getProduct: GetProductQuery,
  ) {}

  @Get()
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.getProduct.all();
    return products.map(ProductResponseDto.fromDomain);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.getProduct.byId(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return ProductResponseDto.fromDomain(product);
  }

  @Post()
  async create(
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.createProduct.execute(dto);
    return ProductResponseDto.fromDomain(product);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.updateProduct.execute(id, dto);
    return ProductResponseDto.fromDomain(product);
  }
}
```

---

### Step 12: Create Module

**File**: Create or update `product.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductOrmEntity]),
  ],
  controllers: [ProductController],
  providers: [
    // Commands
    CreateProductCommand,
    UpdateProductCommand,
    
    // Queries
    GetProductQuery,
    
    // Repository
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepositoryImpl,
    },
    
    // Mapper
    ProductMapper,
  ],
  exports: [
    PRODUCT_REPOSITORY,
    CreateProductCommand,
  ],
})
export class ProductModule {}
```

---

### Step 13: Register in App Module

**File**: `app.module.ts`

```typescript
@Module({
  imports: [
    // ... other modules
    ProductModule,  // <-- Add this
  ],
})
export class AppModule {}
```

---

### Step 14: Create Migration

```bash
# Generate migration
npm run migration:generate --name=CreateProductsTable

# Review the generated migration in src/database/migrations/

# Run migration
npm run migration:run
```

---

## Event Handlers (Optional)

Create event handlers for side effects:

```typescript
// application/event-handlers/send-notification-on-product-created.handler.ts
@Injectable()
export class SendNotificationOnProductCreatedHandler {
  constructor(
    @Inject(EVENT_BUS) private eventBus: IEventBus,
    private notificationService: NotificationService,
  ) {
    this.eventBus.subscribe('product.created', (e) => this.handle(e));
  }

  async handle(event: ProductCreatedEvent): Promise<void> {
    await this.notificationService.send({
      type: 'product_created',
      productId: event.productId.toString(),
      name: event.name,
    });
  }
}
```

---

## Testing

### Unit Test for Domain

```typescript
describe('Product', () => {
  it('should create a product', () => {
    const product = Product.create({
      name: 'Test Product',
      price: 100,
    });

    expect(product.name).toBe('Test Product');
    expect(product.status).toBe(ProductStatus.ACTIVE);
  });

  it('should not allow negative price', () => {
    const product = Product.create({ name: 'Test', price: 100 });
    
    expect(() => {
      product.updatePrice(new Money(-50));
    }).toThrow('Price cannot be negative');
  });
});
```

---

## Checklist

- [ ] Domain entity with business logic
- [ ] Value objects (if needed)
- [ ] Repository interface with injection token
- [ ] Domain events (if needed)
- [ ] Application commands
- [ ] Application queries
- [ ] DTOs with validation
- [ ] TypeORM entity
- [ ] Mapper (domain ↔ ORM)
- [ ] Repository implementation
- [ ] Controller with routes
- [ ] Module definition
- [ ] Registered in AppModule
- [ ] Database migration created
- [ ] Tests written
- [ ] API tested manually

---

## Patterns

### Repository Pattern

```typescript
// Always use interface
constructor(
  @Inject(PRODUCT_REPOSITORY) private repo: IProductRepository,
) {}
```

### Command Pattern

```typescript
@Injectable()
export class CommandName {
  constructor(
    private repo: IRepository,
    private eventBus: IEventBus,
  ) {}

  async execute(data: Input): Promise<Output> {
    // Load entity
    // Perform business logic
    // Save entity
    // Emit events
  }
}
```

### DTO Mapping

```typescript
// Always map domain → DTO
static fromDomain(domain: Entity): ResponseDto {
  return {
    id: domain.id.toString(),
    // ...
  };
}
```

---

## See Also

- `BASE.md` - API architecture overview
- `../webapp/ADDING_ENTITIES.md` - Frontend entity guide
- `../OVERVIEW.md` - System overview
