import "@typespec/http";

using Http;

namespace BookingApi;

/// Одна из ошибок валидации входных данных.
model ValidationErrorDetail {
  field: string;
  message: string;
}

@error
model ValidationError {
  @statusCode statusCode: 400;
  code: "VALIDATION_ERROR";
  message: string;
  details: ValidationErrorDetail[];
}

@error
model SlotOutOfRangeError {
  @statusCode statusCode: 400;
  code: "SLOT_OUT_OF_RANGE";
  message: string;
}

@error
model SlotNotAlignedError {
  @statusCode statusCode: 400;
  code: "SLOT_NOT_ALIGNED";
  message: string;
}

@error
model NotFoundError {
  @statusCode statusCode: 404;
  code: "NOT_FOUND";
  message: string;
}

/// Время уже занято другой бронью — независимо от типа события.
@error
model SlotTakenError {
  @statusCode statusCode: 409;
  code: "SLOT_TAKEN";
  message: string;
}
