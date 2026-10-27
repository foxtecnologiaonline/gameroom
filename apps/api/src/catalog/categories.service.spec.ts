import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: { find: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(CategoryEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('findAll', () => {
    it('lists categories ordered by name', async () => {
      const categories = [{ id: 'cat-1', name: 'Jogos', slug: 'jogos' }];
      repo.find.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toEqual(categories);
    });

    it('returns an empty list when there are no categories', async () => {
      repo.find.mockResolvedValue([]);

      expect(await service.findAll()).toEqual([]);
    });
  });
});
