import "@typespec/http";

import "../models/common.tsp";
import "../models/slot.tsp";
import "../lib/errors.tsp";

using Http;

namespace BookingApi;

@route("/event-types/{eventTypeId}/slots")
namespace Slots {
  /// Сетка слотов для выбранного типа события на 14 дней вперёд от текущей
  /// даты. Сетка строится нарезкой каждого интервала графика занятости
  /// владельца отрезками, равными длительности типа события (от начала
  /// интервала, хвост короче длительности отбрасывается). Возвращаются все
  /// слоты сетки с флагом `available`: `false`, если слот пересекается с
  /// уже существующей бронью любого типа события.
  @tag("guest")
  @get
  op list(@path eventTypeId: EventTypeId): SlotsResponse | NotFoundError;
}
