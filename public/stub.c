// [Fdispatch] is the only function that we use for calling from Emacs to OCaml.
static emacs_value
Fdispatch(emacs_env *env,
          ptrdiff_t nargs,
          emacs_value args[],
          void *data)
{
  CAMLparam0();
  CAMLlocal3(arg_array, ret, tmp);

  bool need_to_lock_caml = active_env == NULL;

  emacs_env *old_env = active_env;
  active_env = env;
  if (need_to_lock_caml) {
    caml_acquire_runtime_system();
  }

  struct caml_cb *cb = (struct caml_cb *)data;

  if (nargs == 0) {
    // A zero-length array.  The OCaml manual says not to use [caml_alloc] to allocate a
    // zero-length block.
    arg_array = Atom(0);
  } else {
    arg_array = caml_alloc(nargs, 0);
    for (int i = 0; i < nargs; i++) {
      EMACS_TO_OCAML(args[i], tmp);
      Store_field(arg_array, i, tmp);
    }
  }

  CAML_NAMED_CALLBACK(ret, dispatch_function, 2, Val_long(cb->fun_id), arg_array);

  emacs_value ret_val; OCAML_TO_EMACS(ret, ret_val);

  if (need_to_lock_caml) {
    caml_release_runtime_system();
  }
  active_env = old_env;
  CAMLreturnT(emacs_value, ret_val);
}
