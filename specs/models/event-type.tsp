import "./common.tsp";

namespace BookingApi;

/// Тип встречи, который владелец календаря предлагает гостям для бронирования.
model EventType {
  @visibility(Lifecycle.Read)
  id: EventTypeId;

  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(2000)
  description: string;

  /// Длительность встречи в минутах.
  @minValue(5)
  @maxValue(480)
  durationMinutes: int32;
}

/// Данные для создания типа события. `id` присваивается сервером.
model EventTypeCreate {
  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(2000)
  description: string;

  @minValue(5)
  @maxValue(480)
  durationMinutes: int32;
}

/// Данные для частичного обновления типа события.
model EventTypeUpdate {
  @minLength(1)
  @maxLength(120)
  title?: string;

  @maxLength(2000)
  description?: string;

  @minValue(5)
  @maxValue(480)
  durationMinutes?: int32;
}
