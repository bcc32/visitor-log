type t =
  { text      : string
  ; timestamp : string }

type js_t

val of_js : js_t -> t

val of_json : Js.Json.t -> t option
