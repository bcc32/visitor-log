module Model : sig
  type t
end

module Msg : sig
  type t
end

val main : Web.Node.t Js.null_undefined -> unit -> Msg.t Tea.App.programInterface
