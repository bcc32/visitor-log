type 'a t = 'a option =
  | None
  | Some of 'a
[@@bs.deriving {accessors}]

let value t ~default =
  match t with
  | None -> default
  | Some x -> x
;;

let bind t ~f =
  match t with
  | None -> None
  | Some x -> f x
;;

let map t ~f =
  match t with
  | None -> None
  | Some x -> Some (f x)
;;

let return = some
