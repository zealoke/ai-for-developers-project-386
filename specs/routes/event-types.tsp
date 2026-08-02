import "@typespec/http";

import "../models/event-type.tsp";
import "../lib/errors.tsp";

using Http;

namespace BookingApi;

@route("/event-types")
namespace EventTypes {
  /// Список всех типов событий, доступных гостям для бронирования.
  @tag("guest")
  @get
  op list(): EventType[];

  /// Создать новый тип события. `id` присваивается сервером.
  @tag("admin")
  @post
  op create(@body body: EventTypeCreate):
    | {
        @statusCode statusCode: 201;
        @body result: EventType;
      }
    | ValidationError;

  /// Получить тип события по идентификатору.
  @tag("guest")
  @get
  op read(@path eventTypeId: EventTypeId): EventType | NotFoundError;

  /// Частично обновить тип события.
  @tag("admin")
  @patch
  op update(@path eventTypeId: EventTypeId, @body body: EventTypeUpdate):
    | EventType
    | ValidationError
    | NotFoundError;

  /// Удалить тип события.
  @tag("admin")
  @delete
  op remove(@path eventTypeId: EventTypeId):
    | {
        @statusCode statusCode: 204;
      }
    | NotFoundError;
}
