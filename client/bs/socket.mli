type t

val create
  :  ?namespace:string          (* default is "/" *)
  -> unit
  -> t

val close : t -> unit

val sub : t -> name:string -> f:(_ Js.t -> 'a) -> 'a Tea.Sub.t
