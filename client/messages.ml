open! Import

module Model = struct
  type t =
    { input          : string
    ; messages       : Message.t list
    ; has_error      : bool    (* last server request responded with an error *)
    ; update_pending : bool }
end

module Msg = struct
  type t =
    | Input          of string
    | Message_list   of (Message.t list, Error.t) Result.t
    | Message_update of (unit          , Error.t) Result.t
    | Poll
    | Submit_input
  [@@bs.deriving {accessors}]
end

let get_messages =
  let handle_response result =
    Msg.message_list (
      match result with
      | Error e -> Error (Error.of_http_error e)
      | Ok s ->
        match s |> Js.Json.parseExn |> Js.Json.decodeArray with
        | exception _ -> Error (Error.of_string "not JSON")
        | None -> Error (Error.of_string "not an array")
        | Some jsons ->
          jsons
          |> Array.to_list
          |> List.map (fun json ->
            match Message.of_json json with
            | None -> Error (Error.of_string "could not parse message")
            | Some msg -> Ok msg)
          |> Result.all)
  in
  Tea.Http.getString "/api/messages"
  |> Tea.Http.send handle_response
;;

let get_update =
  Tea.Http.getString "/api/messages/update"
  |> Tea.Http.send (function
    | Ok _ -> Msg.message_update Result.ok_unit
    | Error e -> Msg.message_update (Error (Error.of_http_error e)))
;;

let init () =
  ( { Model.
      input          = ""
    ; messages       = []
    ; has_error      = false
    ; update_pending = false }
  , get_messages )
;;

let decode_response _json = Ok ()

let submit_cmd message =
  let open Tea.Http in
  let handle_response response =
    let { status; body; _ } = response in
    if status.code <> 201
    then (Error status.message)
    else (
      match body with
      | JsonResponse json -> decode_response json
      | _ -> assert false)
  in
  let handle_result result =
    match result with
    | Ok () -> Msg.poll
    | Error e -> failwith (Tea.Http.string_of_error e) (* TODO think about what to do in error case *)
  in
  request
     { method'         = "POST"
     ; headers         = []
     ; url             = "/api/messages"
     ; body            = FormListBody [ ("message", message) ]
     ; expect          = Expect (JsonResponseType, handle_response)
     ; timeout         = None
     ; withCredentials = false }
  |> send handle_result
;;

let update (model : Model.t) msg =
  let (model, cmd) =
    match (msg : Msg.t) with
    | Input input -> ({ model with input }, Tea.Cmd.none)
    | Message_list (Error _) -> ({ model with has_error = true }, Tea.Cmd.none) (* TODO show error *)
    | Message_list (Ok messages) -> ({ model with has_error = false; messages }, Tea.Cmd.none)
    | Message_update (Error _) -> ({ model with has_error = true; update_pending = false }, Tea.Cmd.none)
    | Message_update (Ok _) -> ({ model with has_error = false; update_pending = false }, get_messages)
    | Poll -> (model, get_messages)
    | Submit_input -> ({ model with input = "" }, submit_cmd model.input)
  in
  let (maybe_update, update_pending) =
    if not model.has_error && not model.update_pending
    then (get_update, true)
    else (Tea.Cmd.none, model.update_pending)
  in
  ( { model with update_pending }
  , Tea.Cmd.batch [ cmd; maybe_update ] )
;;

let subscriptions _ =
  Tea.Time.(every (30.0 *. second) (fun _ -> Msg.poll))
;;

let header_row =
  let open Tea.Html in
  tr []
    [ th [ class' "max-width" ] [ text "Message" ]
    ; th [ class' "min-width" ] [ text "Time" ] ]
;;

let message_row (msg : Message.t) =
  let open Tea.Html in
  let timestamp_human = Moment.fromnow msg.timestamp in
  let html_timestamp =
    td [ class' "min-width"; Vdom.prop "title" msg.timestamp ]
      [ text timestamp_human ]
  in
  tr []
    [ td [ class' "max-width" ] [ text msg.text ]
    ; html_timestamp ]
;;

let view (model : Model.t) =
  let open Tea.Html in
  let message_count =
    match List.length model.messages with
    | 0 -> "(no messages)"
    | 1 -> "(1 message)"
    | n -> Printf.sprintf "(%d messages)" n
  in
  div []
    [ form [ id "message-form"; Ev.submit_and_prevent_default Msg.submit_input ]
        [ div [ class' "form-group" ]
            [ div [ class' "input-group" ]
                [ label [ class' "sr-only"; for' "message" ] [ text "Message" ]
                ; input' [ id "message"
                         ; class' "form-control"
                         ; placeholder "Write something..."
                         ; autofocus true
                         ; value model.input
                         ; onInput Msg.input ] []
                ; span [ class' "input-group-btn" ]
                    [ button [ class' "btn btn-default"; type' "submit" ] [ text "Post" ] ] ] ] ]
    ; table [ id "messages"; class' "table table-condensed table-hover" ]
        [ thead [] [ header_row ]
        ; tbody [] (List.map message_row model.messages)
        ; tfoot [] [ td [ class' "center"; Vdom.prop "colspan" "2" ] [ text message_count ] ] ] ]
;;

let main =
  Tea.App.standardProgram
    { init
    ; update
    ; view
    ; subscriptions }
;;
