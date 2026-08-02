import "@typespec/http";

import "../models/booking.tsp";
import "../lib/errors.tsp";

using Http;

namespace BookingApi;

@route("/bookings")
namespace Bookings {
  /// Создать бронь встречи. На одно и то же время нельзя создать две брони,
  /// даже если это разные типы событий — в этом случае сервер вернёт 409.
  @tag("guest")
  @post
  op create(@body body: BookingCreate):
    | {
        @statusCode statusCode: 201;
        @body result: Booking;
      }
    | ValidationError
    | SlotOutOfRangeError
    | SlotNotAlignedError
    | NotFoundError
    | SlotTakenError;

  /// Единый список предстоящих (или всех, в зависимости от фильтров) броней
  /// по всем типам событий.
  @tag("admin")
  @get
  op list(
    /// Нижняя граница диапазона (по `start`), включительно.
    @query from?: plainDate,

    /// Верхняя граница диапазона (по `start`), включительно.
    @query to?: plainDate,

    /// Если `true` (по умолчанию), возвращаются только встречи, которые ещё
    /// не начались, отсортированные по `start` по возрастанию.
    @query upcoming?: boolean,
  ): BookingListItem[];
}
