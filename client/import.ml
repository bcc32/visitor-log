module Result = Result

type ('a, 'b) result = ('a, 'b) Result.t =
  | Ok of 'a
  | Error of 'b
