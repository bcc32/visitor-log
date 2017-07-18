module Model = struct
  type t =
    { messages : Message.t list
    ; has_error : bool          (* last server request responded with an error *)
    ; update_pending : bool
    }
end

type error =
  | HttpError of string Tea.Http.error
  | ParseError of string
  | Many of error list

module Msg = struct
  type t =
    | New_message of Message.t
    | Message_list of (Message.t list, error) Result.t
    | Message_update of (string, string Tea.Http.error) Result.t
    | Poll
end

let get_messages =
  let handle_response (result : (string, string Tea.Http.error) Result.t) : Msg.t =
    Message_list (
      match result with
      | Error e -> Error (HttpError e)
      | Ok s ->
        match s |> Js.Json.parseExn |> Js.Json.decodeArray with
        | exception _ -> Error (ParseError "not JSON")
        | None -> Error (ParseError "not an array")
        | Some jsons ->
          jsons
          |> Array.to_list
          |> List.map (fun json ->
            match Message.of_json json with
            | None -> (Error (ParseError "could not parse message") : (_, _) Result.t)
            | Some msg -> Ok msg)
          |> Result.all
          |> function
          | Ok _ as ok -> ok
          | Error errs -> Error (Many errs))
  in
  Tea.Http.getString "/api/messages"
  |> Tea.Http.send handle_response
;;

let get_update =
  Tea.Http.getString "/api/messages/update"
  |> Tea.Http.send (fun x -> (Message_update x : Msg.t))

let init () =
  ( { Model. messages = []
    ; has_error = false
    ; update_pending = false
    }
  , get_messages
  )

let update (model : Model.t) (msg : Msg.t) =
  let (model, cmd) =
    match msg with
    | New_message s -> ({ model with messages = (s :: model.messages) }, Tea.Cmd.none)
    | Message_list (Ok messages) -> ({ model with has_error = false; messages }, Tea.Cmd.none)
    | Message_list (Error _) -> ({ model with has_error = true }, Tea.Cmd.none) (* TODO show error *)
    | Message_update (Ok _) -> ({ model with has_error = false; update_pending = false }, get_messages)
    | Message_update (Error _) -> ({ model with has_error = true; update_pending = false }, Tea.Cmd.none)
    | Poll -> (model, get_messages)
  in
  let (maybe_update, update_pending) =
    if not model.has_error && not model.update_pending
    then (get_update, true)
    else (Tea.Cmd.none, model.update_pending)
  in
  ({ model with update_pending = update_pending }, Tea.Cmd.batch [cmd; maybe_update])
;;

let subscriptions _ =
  Tea.Time.(every (30.0 *. second) (fun _ -> Msg.Poll))
;;

let header_row =
  let open Tea.Html in
  tr []
    [ th [ class' "max-width" ] [ text "Message" ]
    ; th [ class' "min-width" ] [ text "Time" ]
    ]
;;

let message_row (msg : Message.t) =
  let open Tea.Html in
  let html_timestamp =
    td [ class' "min-width"; Vdom.prop "title" msg.timestamp ]
      [ text msg.timestamp_human ]
  in
  tr []
    [ td [ class' "max-width" ] [ text msg.text ]
    ; html_timestamp
    ]
;;

let view (model : Model.t) =
  let open Tea.Html in
  let message_count =
    match List.length model.messages with
    | 1 -> "(1 message)"
    | n -> Printf.sprintf "(%d messages)" n
  in
  table [ id "messages"; class' "table table-condensed table-hover" ]
    [ thead [] [ header_row ]
    ; tbody [] (List.map message_row model.messages)
    ; tfoot [] [ td [ class' "center"; Vdom.prop "colspan" "2" ] [ text message_count ] ]
    ]
;;

let main =
  Tea.App.standardProgram
    { init
    ; update
    ; subscriptions
    ; view
    }
;;
