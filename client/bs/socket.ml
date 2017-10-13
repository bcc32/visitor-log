type t

external create : string -> t = "io" [@@bs.val]

let create ?(namespace = "/") () = create namespace

external close : t -> unit = "close" [@@bs.send]

external on  : t -> string -> (_ Js.t -> unit [@bs.uncurry]) -> unit = "on"  [@@bs.send]
external off : t -> string -> (_ Js.t -> unit [@bs.uncurry]) -> unit = "off" [@@bs.send]

let sub t ~name ~f =
  Tea.Sub.registration name (fun { enqueue } ->
    let callback data = enqueue (f data) in
    on t name callback;
    fun () -> off t name callback)
;;
