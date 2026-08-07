import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import type { BookingView, BookingListItemView } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsListQueryDto } from './dto/bookings-list-query.dto';

/**
 * HTTP-контроллер `@route("/bookings")` из specs/routes/bookings.tsp.
 *
 * 2 операции:
 *   POST /v1/bookings             — создать бронь (guest), 201
 *                                   ValidationError | SLOT_OUT_OF_RANGE |
 *                                   SLOT_NOT_ALIGNED | NOT_FOUND | SLOT_TAKEN
 *   GET  /v1/bookings?from&to&upcoming — список броней (admin) с фильтрами
 *
 * Авторизации нет — теги `@tag("guest")`/`@tag("admin")` документационные.
 */
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto): BookingView {
    return this.bookings.create(dto);
  }

  @Get()
  list(@Query() query: BookingsListQueryDto): BookingListItemView[] {
    return this.bookings.list(query);
  }
}
