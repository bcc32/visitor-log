type t =
  { text      : string
  ; timestamp : string }

class type _js_t = object
  method message   : string
  method timestamp : string
end [@bs]
type js_t = _js_t Js.t

let of_js js =
  { text      = js##message
  ; timestamp = js##timestamp }
;;

let of_json json =
  match json |> Js.Json.decodeObject with
  | None -> None
  | Some dict ->
    let get x =
      match Js.Dict.get dict x with
      | None -> None
      | Some s -> Js.Json.decodeString s
    in
    match
      ( get "message"
      , get "timestamp" )
    with
    | Some text, Some timestamp ->
      Some { text; timestamp }
    | _ -> None
;;
