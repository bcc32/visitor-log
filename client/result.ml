type ('a, 'b) t = ('a, 'b) Tea.Result.t =
  | Ok of 'a
  | Error of 'b

let all ts =
  let rec loop ts oks errors =
    match ts with
    | [] ->
      begin match errors with
      | [] -> Ok (List.rev oks)
      | _ -> Error (List.rev errors)
      end
    | hd :: tl ->
      begin match hd with
      | Ok x -> loop tl (x :: oks) errors
      | Error x -> loop tl oks (x :: errors)
      end
  in
  loop ts [] []
;;
