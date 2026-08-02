import "./common.tsp";

namespace BookingApi;

/// Один слот в сетке бронирования для выбранного типа события.
model Slot {
  /// Начало слота (UTC).
  start: utcDateTime;

  /// Конец слота (UTC).
  end: utcDateTime;

  /// `false`, если слот пересекается с уже существующей бронью
  /// (любого типа события — не только выбранного).
  available: boolean;
}

/// Слоты одного календарного дня.
model DaySlots {
  date: plainDate;
  slots: Slot[];
}

/// Ответ на запрос сетки слотов для типа события.
model SlotsResponse {
  eventTypeId: EventTypeId;
  durationMinutes: int32;

  /// IANA-имя часового пояса владельца, в котором был построен график.
  timeZone: string;

  /// Начало окна бронирования (сегодня).
  rangeStart: plainDate;

  /// Конец окна бронирования (rangeStart + 14 дней).
  rangeEnd: plainDate;

  /// Слоты по дням, включая дни без единого слота.
  days: DaySlots[];
}
