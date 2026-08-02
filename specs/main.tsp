import "@typespec/http";

import "./lib/errors.tsp";
import "./models/common.tsp";
import "./models/availability.tsp";
import "./models/event-type.tsp";
import "./models/slot.tsp";
import "./models/booking.tsp";
import "./routes/event-types.tsp";
import "./routes/availability.tsp";
import "./routes/slots.tsp";
import "./routes/bookings.tsp";

using Http;

/// API для упрощённого сервиса бронирования встреч (аналог cal.com).
///
/// Ролей две: владелец календаря (заранее заведённый профиль, без
/// авторизации в этом контракте) и гость, который бронирует встречу без
/// регистрации.
@service(#{ title: "Meeting Booking API" })
@server("https://api.example.com/v1", "Основной сервер API")
namespace BookingApi;
