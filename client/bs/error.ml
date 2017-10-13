type t = string Lazy.t

let to_string = Lazy.force

let of_http_error error =
  lazy (Tea.Http.string_of_error error)
;;

let of_string string =
  lazy string
;;

let of_list errors =
  lazy (
    errors
    |> List.map to_string
    |> String.concat "; ")
;;
