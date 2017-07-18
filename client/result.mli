type ('a, 'err) t = ('a, 'err) Tea.Result.t =
  | Ok of 'a
  | Error of 'err

val map
  :  ('a, 'err) t
  -> f:('a -> 'b)
  -> ('b, 'err) t

val (>>|)
  :  ('a, 'err) t
  -> f:('a -> 'b)
  -> ('b, 'err) t

val bind
  :  ('a, 'err) t
  -> f:('a -> ('b, 'err) t)
  -> ('b, 'err) t

val (>>=)
  :  ('a, 'err) t
  -> f:('a -> ('b, 'err) t)
  -> ('b, 'err) t

val all : ('a, 'err) t list -> ('a list, 'err) t
