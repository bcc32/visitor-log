import Html exposing (..)
import Html.Attributes exposing (..)
import Http
import Json.Decode as Decode
import Time exposing (Time)

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
  }

init : (Model, Cmd Msg)
init = (Model [], getMessages)

-- UPDATE

getMessages : Cmd Msg
getMessages =
  Http.get "/api/messages" decodeMessages
  |> Http.send LoadMessages

getUpdate : Cmd Msg
getUpdate =
  Http.getString "/api/messages/update"
  |> Http.send UpdateMessages

decodeMessage : Decode.Decoder Message
decodeMessage =
  Decode.map3 Message
    (Decode.field "message"         Decode.string)
    (Decode.field "timestamp"       Decode.string)
    (Decode.field "timestamp_human" Decode.string)

decodeMessages : Decode.Decoder (List Message)
decodeMessages = Decode.list decodeMessage

type Msg =
    NewMessage Message
  | LoadMessages (Result Http.Error (List Message))
  | UpdateMessages (Result Http.Error String)

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    NewMessage s -> { model | messages = (s :: model.messages) } ! []
    LoadMessages (Ok ms) -> { model | messages = ms } ! [ getUpdate ]
    LoadMessages (Err e) -> model ! [] -- TODO show error
    UpdateMessages _ -> model ! [ getMessages ]

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model = Sub.none -- TODO subscribe to updates from server

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
