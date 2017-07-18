type t

val to_string : t -> string

val of_http_error : _ Tea.Http.error -> t

val of_string : string -> t

val of_list : t list -> t
