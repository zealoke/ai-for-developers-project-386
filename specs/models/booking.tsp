import "./common.tsp";

namespace BookingApi;

/// Бронь встречи, созданная гостем.
model Booking {
  @visibility(Lifecycle.Read)
  id: string;

  eventTypeId: EventTypeId;

  /// Начало встречи (UTC).
  start: utcDateTime;

  /// Конец встречи (UTC), вычисляется сервером из длительности типа события.
  @visibility(Lifecycle.Read)
  end: utcDateTime;

  @minLength(1)
  @maxLength(200)
  guestName: string;

  guestEmail: Email;

  @maxLength(2000)
  notes?: string;

  @visibility(Lifecycle.Read)
  createdAt: utcDateTime;
}

/// Данные для создания брони. `end` клиент не передаёт — сервер сам
/// вычисляет его из `durationMinutes` выбранного типа события.
model BookingCreate {
  eventTypeId: EventTypeId;
  start: utcDateTime;

  @minLength(1)
  @maxLength(200)
  guestName: string;

  guestEmail: Email;

  @maxLength(2000)
  notes?: string;
}

/// Элемент единого списка предстоящих встреч владельца календаря.
model BookingListItem {
  ...Booking;

  /// Название типа события на момент брони (для отображения без доп. запроса).
  eventTypeTitle: string;

  /// Длительность встречи в минутах.
  durationMinutes: int32;
}
