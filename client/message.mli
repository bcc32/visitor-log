type t =
  { text      : string
  ; timestamp : string
  }

val of_json : Js.Json.t -> t option
