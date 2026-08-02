namespace BookingApi;

/// День недели.
enum Weekday {
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
}

/// Идентификатор типа события (UUID, генерируется сервером).
@format("uuid")
scalar EventTypeId extends string;

/// Электронная почта гостя.
@format("email")
scalar Email extends string;
