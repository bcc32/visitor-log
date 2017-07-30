type t

external create_without_namespace : unit   -> t = "io" [@@bs.val]
external create_with_namespace    : string -> t = "io" [@@bs.val]

let create ?namespace () =
  match namespace with
  | None -> create_without_namespace ()
  | Some ns -> create_with_namespace ns
;;

external close : t -> unit = "close" [@@bs.send]

external on  : t -> string -> (_ Js.t -> unit [@bs]) -> unit = "on"  [@@bs.send]
external off : t -> string -> (_ Js.t -> unit [@bs]) -> unit = "off" [@@bs.send]

let sub t ~name ~f =
  Tea.Sub.registration name (fun { enqueue } ->
    let callback = fun [@bs] data -> enqueue (f data) in
    on t name callback;
    fun () -> off t name callback)
;;
