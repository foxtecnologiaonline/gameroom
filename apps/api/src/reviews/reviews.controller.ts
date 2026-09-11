import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    return this.reviews.create(user, dto);
  }

  @Get('sellers/:id/reviews')
  findBySeller(@Param('id') id: string): Promise<ReviewEntity[]> {
    return this.reviews.findBySeller(id);
  }
}
