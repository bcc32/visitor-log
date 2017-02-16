import Html exposing (..)
import Html.Attributes exposing (..)
import Http
import Json.Decode as Decode exposing (field, string)
import Time exposing (Time, second)

main =
  Html.program
    { init = init
    , update = update
    , subscriptions = subscriptions
    , view = view
    }

-- MODEL

type alias Message =
  { text : String
  , timestamp : String
  , timestampHuman : String
  }

type alias Model =
  { messages : List Message
  , hasError : Bool -- last server request responded with an error
  , updatePending : Bool
  }

init : (Model, Cmd Msg)
init = (Model [] False False, getMessages)

-- UPDATE

getMessages : Cmd Msg
getMessages =
  Http.get "/api/messages" decodeMessages
  |> Http.send MessageList

decodeMessage : Decode.Decoder Message
decodeMessage =
  Decode.map3 Message
    (field "message"         string)
    (field "timestamp"       string)
    (field "timestamp_human" string)

decodeMessages : Decode.Decoder (List Message)
decodeMessages = Decode.list decodeMessage

getUpdate : Cmd Msg
getUpdate =
  Http.getString "/api/messages/update"
  |> Http.send MessageUpdate

decodeUpdate : Decode.Decoder Message
decodeUpdate = decodeMessage

type Msg =
    NewMessage Message
  | MessageList (Result Http.Error (List Message))
  | MessageUpdate (Result Http.Error String)
  | Poll

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  let
    (newModel, cmd) =
      case msg of
        NewMessage s -> { model | messages = (s :: model.messages) } ! []
        MessageList (Ok ms) -> { model | hasError = False, messages = ms } ! []
        MessageList (Err e) -> { model | hasError = True } ! [] -- TODO show error
        MessageUpdate (Ok _) -> { model | hasError = False, updatePending = False } ! [ getMessages ]
        MessageUpdate (Err _) -> { model | hasError = True, updatePending = False } ! []
        Poll -> model ! [ getMessages ]
    (maybeUpdate, updatePending) =
      if not newModel.hasError && not newModel.updatePending then
        (getUpdate, True)
      else
        (Cmd.none, newModel.updatePending)
  in
  { newModel | updatePending = updatePending } ! [cmd, maybeUpdate]

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
  Time.every (30 * second) (\time -> Poll)

-- VIEW

headerRow : Html Msg
headerRow =
  tr []
    [ th [ class "max-width" ] [ text "Message" ]
    , th [ class "min-width" ] [ text "Time" ]
    ]

messageRow : Message -> Html Msg
messageRow msg =
  let
    htmlTimestamp =
      td [ class "min-width", title msg.timestamp ]
        [ text msg.timestampHuman ]
  in
  tr []
    [ td [ class "max-width" ] [ text msg.text ]
    , htmlTimestamp
    ]

view : Model -> Html Msg
view model =
  let
    n = List.length model.messages
    messageCount =
      if n == 1 then
        "1 message"
      else
        toString n ++ " messages"
  in
  table [ id "messages", class "table table-condensed table-hover" ]
    [ thead [] [ headerRow ]
    , tbody [] (List.map messageRow model.messages)
    , tfoot [ class "center", colspan 2 ]
      [ text messageCount ]
    ]
