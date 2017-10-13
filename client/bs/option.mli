type 'a t = 'a option

val none : _ t
val some : 'a -> 'a t

val value : 'a t -> default:'a -> 'a

val bind   : 'a t -> f:('a -> 'b t) -> 'b t
val map    : 'a t -> f:('a -> 'b)   -> 'b t
val return : 'a   -> 'a t
