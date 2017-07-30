open! Import

module Model = struct
  type t =
    { input          : string
    ; messages       : Message.t list
    ; socket         : Socket.t }
end

module Msg = struct
  type t =
    | Input        of string
    | Message_list of (Message.t list, Error.t) Result.t
    | Message      of Message.t
    | No_op
    | Submit_input
  [@@bs.deriving {accessors}]
end

let init () =
  ( { Model.
      input          = ""
    ; messages       = []
    ; socket         = Socket.create () ~namespace:"/messages" }
  , Tea.Cmd.none )
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
    | Ok () -> Msg.no_op
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

let rec update (model : Model.t) msg =
  match (msg : Msg.t) with
  | Input input -> ({ model with input }, Tea.Cmd.none)
  | Message_list (Error _) -> update model No_op
  | Message_list (Ok messages) -> ({ model with messages }, Tea.Cmd.none)
  | Message msg -> ({ model with messages = msg :: model.messages }, Tea.Cmd.none)
  | No_op -> (model, Tea.Cmd.none)
  | Submit_input -> ({ model with input = "" }, submit_cmd model.input)
;;

type message_list
external message_list_length : message_list -> int = "length" [@@bs.get]
external message_list_get    : message_list -> int -> Message.js_t = "" [@@bs.get_index]

let message_list_of_message_list message_list =
  let length = message_list_length message_list in
  Array.init length (fun i -> message_list_get message_list i |> Message.of_js)
  |> Array.to_list
;;

let subscriptions (model : Model.t) =
  Tea.Sub.batch
    [ Socket.sub model.socket ~name:"messages" ~f:(fun msg ->
        let msg = (Obj.magic msg : message_list) in (* FIXME get rid of Obj.magic here and below *)
        let msg = message_list_of_message_list msg in
        Msg.message_list (Ok msg))
    ; Socket.sub model.socket ~name:"message" ~f:(fun msg ->
        let msg = (Obj.magic msg : Message.js_t) in
        let msg = Message.of_js msg in
        Msg.message msg) ]
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
