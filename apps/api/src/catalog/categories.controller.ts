import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';

/**
 * Público, sem CRUD (a spec não lista um em catalog — ver pendência no
 * CLAUDE.md): as 5 categorias do MVP são seed de dados na migration
 * InitCatalog. Existe só para que clients (seller panel, item 13) possam
 * resolver um categoryId ao criar produto sem hardcodar UUIDs gerados
 * pela migration.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(): Promise<CategoryEntity[]> {
    return this.categories.findAll();
  }
}
