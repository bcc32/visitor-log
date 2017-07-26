open! Import

module Model = struct
  type t =
    { url  : string
    ; word : string option }
end

module Msg = struct
  type t =
    | Submit_input
    | Url       of string
    | Short_url of string * string (* url, word *)
  [@@bs.deriving {accessors}]
end

let init () =
  ( { Model.
      url  = ""
    ; word = None }
  , Tea.Cmd.none )
;;

let decode_response json =
  match json |> Js.Json.decodeObject with
  | None -> Error "not a JSON object"
  | Some dict ->
    let get x = Js.Dict.get dict x in
    match get "url", get "word" with
    | None, _ -> Error "missing key [url]"
    | _, None -> Error "missing key [word]"
    | Some a, Some b ->
      let str = Js.Json.decodeString in
      match str a, str b with
      | None, _ -> Error "[url] not a string"
      | _, None -> Error "[word] not a string"
      | Some a, Some b -> Ok (a, b)
;;

let submit_input_cmd url =
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
  let handle_result =
    function
    | Ok (url, short_url) -> Msg.short_url url short_url
    | Error e -> failwith (Tea.Http.string_of_error e) (* TODO show error
                                                          message *)
  in
  request
    { method'         = "POST"
    ; headers         = []
    ; url             = "/api/u"
    ; body            = FormListBody [ ("url", url) ]
    ; expect          = Expect (JsonResponseType, handle_response)
    ; timeout         = None
    ; withCredentials = false }
  |> send handle_result
;;

let update (model : Model.t) msg =
  match (msg : Msg.t) with
  | Submit_input ->
    ( model, submit_input_cmd model.url )
  | Url url ->
    ( { Model.
        url
      ; word = None }
    , Tea.Cmd.none )
  | Short_url (url, word) ->
    let model =
      if url = model.url
      then { model with word = Some word }
      else model
    in
    ( model, Tea.Cmd.none )
;;

let subscriptions _ = Tea.Sub.none

external current_href : string = "location.href" [@@bs.val]

let view_short_url word =
  let open Tea.Html in
  match word with
  | None -> noNode              (* TODO show a node with pending indication *)
  | Some s ->
    let url = current_href ^ "/" ^ s in
    a [ id "short-url"; href url ]
      [ h2 [] [ text s ] ]
;;

let submit_and_prevent_default event =
  event##preventDefault ();
  event##stopPropagation ();
  Some Msg.submit_input
;;

let view (model : Model.t) =
  let open Tea.Html in
  div []
    [ form [ class' "form"; onCB "submit" "" submit_and_prevent_default ]
        [ div [ class' "input-group" ]
            [ label [ class' "input-group-addon"; for' "url" ] [ text "URL" ]
            (* TODO when pending, disable input *)
            ; input' [ id "url"; class' "form-control"
                     ; value model.url
                     ; autofocus true
                     ; onInput Msg.url ] []
            ; span [ class' "input-group-btn" ]
                [ button [ class' "btn btn-primary"; type' "button" ]
                    [ text "Go!" ] ] ] ]
    ; view_short_url model.word ]
;;

let main =
  Tea.App.standardProgram
    { init
    ; update
    ; subscriptions
    ; view }
;;
