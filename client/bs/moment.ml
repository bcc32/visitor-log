type t

type iso8601_string = string

external of_iso6801_string : iso8601_string -> t = "moment" [@@bs.module]

external time_string_from_now : t -> string = "fromNow" [@@bs.send]

let fromnow iso8601_string =
  iso8601_string
  |> of_iso6801_string
  |> time_string_from_now
;;
