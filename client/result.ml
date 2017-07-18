type ('a, 'err) t = ('a, 'err) Tea.Result.t =
  | Ok of 'a
  | Error of 'err

let all ts =
  let rec loop ts oks =
    match ts with
    | [] -> Ok (List.rev oks)
    | hd :: tl ->
      begin match hd with
      | Ok x -> loop tl (x :: oks)
      | Error _ as err -> err
      end
  in
  loop ts []
;;

let map t ~f =
  match t with
  | Error e -> Error e
  | Ok x -> Ok (f x)
;;

let (>>|) = map

let bind t ~f =
  match t with
  | Error e -> Error e
  | Ok x -> f x
;;

let (>>=) = bind
