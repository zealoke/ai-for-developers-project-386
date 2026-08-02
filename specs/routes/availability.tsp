import "@typespec/http";

import "../models/availability.tsp";
import "../lib/errors.tsp";

using Http;

namespace BookingApi;

@route("/availability")
namespace Availability {
  /// Получить текущий общий график занятости владельца календаря.
  @tag("admin")
  @get
  op read(): AvailabilitySchedule;

  /// Полностью заменить график занятости владельца календаря (идемпотентно).
  @tag("admin")
  @put
  op replace(@body body: AvailabilitySchedule):
    | AvailabilitySchedule
    | ValidationError;
}
