type t =
  { text            : string
  ; timestamp       : string
  }

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
      , get "timestamp"
      )
    with
    | Some text, Some timestamp ->
      Some { text; timestamp }
    | _ -> None
;;
