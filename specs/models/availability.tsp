import "./common.tsp";

namespace BookingApi;

/// Интервал занятости владельца календаря в один из дней недели.
/// `startTime`/`endTime` — локальное время владельца в часовом поясе `AvailabilitySchedule.timeZone`.
model AvailabilityInterval {
  weekday: Weekday;
  startTime: plainTime;
  endTime: plainTime;
}

/// Общий график занятости владельца календаря.
model AvailabilitySchedule {
  /// IANA-имя часового пояса владельца, например `Europe/Moscow`.
  timeZone: string;

  /// Интервалы занятости. Может быть несколько интервалов на один день недели.
  intervals: AvailabilityInterval[];
}
